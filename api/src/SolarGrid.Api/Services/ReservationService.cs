/*
 * File:    ReservationService.cs
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: Business rules for energy reservations:
 *          - bookings start in the future and at most 7 days ahead
 *          - changes and cancellations need at least 12 hours' notice
 *          - one bay per booking, taken atomically so a slot is never overbooked
 *          - a prosumer cannot hold two bookings at the same time
 *          - a changed booking needs approval again and gets a new QR code
 *          - prosumers only see and change their own bookings
 */
using System.Security.Cryptography;
using MongoDB.Bson;
using SolarGrid.Api.Common;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Models;
using SolarGrid.Api.Repositories;
using SolarGrid.Api.Security;

namespace SolarGrid.Api.Services;

public class ReservationService : IReservationService
{
    public static readonly TimeSpan BookingWindow = TimeSpan.FromDays(7);
    public static readonly TimeSpan ChangeNotice = TimeSpan.FromHours(12);

    // No 0/O or 1/I, so reference numbers are easy to read out.
    private const string ReferenceChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private const string ChangedElsewhereMessage = "This booking was changed by someone else. Please reload it and try again.";

    private readonly IReservationRepository _reservations;
    private readonly ISlotRepository _slots;
    private readonly IStationRepository _stations;
    private readonly IUserRepository _users;
    private readonly IQrTokenService _qr;
    private readonly AppClock _clock;
    private readonly ILogger<ReservationService> _logger;

    // Needs the reservation, slot, station and user stores, the QR service, the clock and a logger.
    public ReservationService(IReservationRepository reservations, ISlotRepository slots, IStationRepository stations,
        IUserRepository users, IQrTokenService qr, AppClock clock, ILogger<ReservationService> logger)
    {
        _reservations = reservations;
        _slots = slots;
        _stations = stations;
        _users = users;
        _qr = qr;
        _clock = clock;
        _logger = logger;
    }

    // Booking lists and search. Prosumers only ever get their own bookings.
    public async Task<PagedResult<ReservationResponse>> ListAsync(ReservationQuery query, CurrentUser caller)
    {
        var (page, pageSize) = PagedResult<ReservationResponse>.Normalize(query.Page, query.PageSize);
        var now = _clock.UtcNow;

        var filter = new ReservationFilter
        {
            ProsumerNic = caller.IsStaff ? NicOrNull(query.Nic) : caller.Nic,
            StationId = string.IsNullOrWhiteSpace(query.StationId) ? null : query.StationId.Trim(),
            StartFromUtc = query.From.HasValue ? _clock.ToUtc(query.From.Value, 0) : null,
            StartBeforeUtc = query.To.HasValue ? _clock.ToUtc(query.To.Value.AddDays(1), 0) : null,
            Search = query.Search
        };

        var statuses = query.Status.HasValue ? new[] { query.Status.Value } : null;
        switch (query.Scope)
        {
            case ReservationScope.Current:
                statuses = Narrow(query.Status, ReservationStatus.Approved);
                filter.EndsAfterUtc = now;
                filter.NewestFirst = false;
                break;
            case ReservationScope.Pending:
                statuses = Narrow(query.Status, ReservationStatus.Pending);
                filter.EndsAfterUtc = now;
                filter.NewestFirst = false;
                break;
            case ReservationScope.History:
                filter.HistoryAtUtc = now;
                break;
        }

        // A status that does not belong to the chosen list can never match.
        if (statuses is { Length: 0 })
            return new PagedResult<ReservationResponse>(Array.Empty<ReservationResponse>(), 0, page, pageSize);

        filter.Statuses = statuses;
        var (items, total) = await _reservations.SearchAsync(filter, page, pageSize);
        return new PagedResult<ReservationResponse>(items.Select(ToResponse).ToList(), total, page, pageSize);
    }

    // One booking, if the caller may see it.
    public async Task<ReservationResponse> GetAsync(string id, CurrentUser caller)
    {
        var reservation = await GetAccessibleAsync(id, caller);
        return ToResponse(reservation);
    }

    // Books one bay in a slot. New bookings wait for approval.
    public async Task<ReservationResponse> CreateAsync(CreateReservationRequest request, CurrentUser caller)
    {
        var prosumer = await ResolveProsumerAsync(request.ProsumerNic, caller);
        var (slot, station) = await GetBookableSlotAsync(request.SlotId);
        var energy = request.EnergyKwh!.Value;
        EnsureEnergyFits(station, energy);

        if (await _reservations.HasOverlapForProsumerAsync(prosumer.Nic, slot.StartTime, slot.EndTime))
            throw new ConflictException(OverlapMessage(caller));

        if (!await _slots.TryTakeBayAsync(slot.Id))
            throw new ConflictException("This slot is fully booked. Please choose another slot.");

        var now = _clock.UtcNow;
        var reservation = new EnergyReservation
        {
            Id = ObjectId.GenerateNewId().ToString(),
            ReferenceNo = NewReferenceNo(),
            ProsumerNic = prosumer.Nic,
            ProsumerName = prosumer.FullName,
            StationId = station.Id,
            StationName = station.Name,
            SlotId = slot.Id,
            StartTime = slot.StartTime,
            EndTime = slot.EndTime,
            TradeType = request.TradeType!.Value,
            EnergyKwh = energy,
            Status = ReservationStatus.Pending,
            CreatedBy = caller.Nic,
            CreatedAt = now,
            UpdatedAt = now
        };

        try
        {
            await _reservations.InsertAsync(reservation);
        }
        catch
        {
            // Give the bay back so the slot does not look fuller than it is.
            await _slots.ReleaseBayAsync(slot.Id);
            throw;
        }

        _logger.LogInformation("Reservation {Reference} created for {Nic} by {Actor}.",
            reservation.ReferenceNo, prosumer.Nic, caller.Nic);
        return ToResponse(reservation);
    }

    // Changes slot, energy or trade type. The booking goes back to Pending for approval.
    public async Task<ReservationResponse> UpdateAsync(string id, UpdateReservationRequest request, CurrentUser caller)
    {
        var reservation = await GetAccessibleAsync(id, caller);
        EnsureChangeable(reservation, "changed");

        var previousStatus = reservation.Status;
        var previousSlotId = reservation.SlotId;
        var movesSlot = request.SlotId != reservation.SlotId;
        var energy = request.EnergyKwh!.Value;

        if (movesSlot)
        {
            var (slot, station) = await GetBookableSlotAsync(request.SlotId);
            EnsureEnergyFits(station, energy);

            if (await _reservations.HasOverlapForProsumerAsync(reservation.ProsumerNic, slot.StartTime, slot.EndTime, reservation.Id))
                throw new ConflictException(OverlapMessage(caller));

            if (!await _slots.TryTakeBayAsync(slot.Id))
                throw new ConflictException("The new slot is fully booked. Please choose another slot.");

            reservation.SlotId = slot.Id;
            reservation.StationId = station.Id;
            reservation.StationName = station.Name;
            reservation.StartTime = slot.StartTime;
            reservation.EndTime = slot.EndTime;
        }
        else
        {
            var station = await _stations.GetByIdAsync(reservation.StationId)
                ?? throw new NotFoundException("Station not found.");
            EnsureEnergyFits(station, energy);
        }

        reservation.EnergyKwh = energy;
        reservation.TradeType = request.TradeType!.Value;
        reservation.Status = ReservationStatus.Pending;
        reservation.ApprovedBy = null;
        reservation.ApprovedAt = null;
        reservation.QrNonce = null;
        reservation.UpdatedAt = _clock.UtcNow;

        if (!await _reservations.ReplaceIfStatusAsync(reservation, previousStatus))
        {
            if (movesSlot)
                await _slots.ReleaseBayAsync(reservation.SlotId);

            throw new ConflictException(ChangedElsewhereMessage);
        }

        if (movesSlot)
            await _slots.ReleaseBayAsync(previousSlotId);

        return ToResponse(reservation);
    }

    // Cancels a booking and frees its bay.
    public async Task<ReservationResponse> CancelAsync(string id, CancelReservationRequest? request, CurrentUser caller)
    {
        var reservation = await GetAccessibleAsync(id, caller);
        EnsureChangeable(reservation, "cancelled");

        var previousStatus = reservation.Status;
        var now = _clock.UtcNow;
        reservation.Status = ReservationStatus.Cancelled;
        reservation.CancelledBy = caller.Nic;
        reservation.CancelledAt = now;
        reservation.Reason = TrimOrNull(request?.Reason);
        reservation.QrNonce = null;
        reservation.UpdatedAt = now;

        await SaveStatusChangeAsync(reservation, previousStatus);
        await _slots.ReleaseBayAsync(reservation.SlotId);
        return ToResponse(reservation);
    }

    // Staff approve a pending booking; this issues the QR code.
    public async Task<ReservationResponse> ApproveAsync(string id, CurrentUser caller)
    {
        EnsureStaff(caller);
        var reservation = await GetReservationAsync(id);

        if (reservation.Status != ReservationStatus.Pending)
            throw new BusinessRuleException("Only pending bookings can be approved.");

        var now = _clock.UtcNow;
        if (reservation.StartTime <= now)
            throw new BusinessRuleException("This booking's start time has already passed.");

        reservation.Status = ReservationStatus.Approved;
        reservation.ApprovedBy = caller.Nic;
        reservation.ApprovedAt = now;
        reservation.QrNonce = _qr.NewNonce();
        reservation.UpdatedAt = now;

        await SaveStatusChangeAsync(reservation, ReservationStatus.Pending);
        return ToResponse(reservation);
    }

    // Staff reject a pending booking with a reason; the bay is freed.
    public async Task<ReservationResponse> RejectAsync(string id, RejectReservationRequest request, CurrentUser caller)
    {
        EnsureStaff(caller);
        var reservation = await GetReservationAsync(id);

        if (reservation.Status != ReservationStatus.Pending)
            throw new BusinessRuleException("Only pending bookings can be rejected.");

        var now = _clock.UtcNow;
        reservation.Status = ReservationStatus.Rejected;
        reservation.RejectedBy = caller.Nic;
        reservation.RejectedAt = now;
        reservation.Reason = request.Reason.Trim();
        reservation.UpdatedAt = now;

        await SaveStatusChangeAsync(reservation, ReservationStatus.Pending);
        await _slots.ReleaseBayAsync(reservation.SlotId);
        return ToResponse(reservation);
    }

    // The signed QR text for an approved booking.
    public async Task<QrCodeResponse> GetQrCodeAsync(string id, CurrentUser caller)
    {
        var reservation = await GetAccessibleAsync(id, caller);
        if (reservation.Status != ReservationStatus.Approved || string.IsNullOrEmpty(reservation.QrNonce))
            throw new BusinessRuleException("A QR code is only available for approved bookings.");

        return new QrCodeResponse
        {
            ReservationId = reservation.Id,
            ReferenceNo = reservation.ReferenceNo,
            StationName = reservation.StationName,
            StartTime = reservation.StartTime,
            EndTime = reservation.EndTime,
            Payload = _qr.CreatePayload(reservation)
        };
    }

    // True while a booking may still be changed or cancelled.
    public static bool CanChange(EnergyReservation reservation, DateTime nowUtc)
    {
        return reservation.Status is ReservationStatus.Pending or ReservationStatus.Approved
            && reservation.StartTime - nowUtc >= ChangeNotice;
    }

    // Prosumers book for themselves; staff must say which prosumer the booking is for.
    private async Task<User> ResolveProsumerAsync(string? requestedNic, CurrentUser caller)
    {
        var nic = NicOrNull(requestedNic);
        if (caller.IsStaff && nic == null)
            throw new BusinessRuleException("Select the prosumer for this booking.");

        if (!caller.IsStaff)
        {
            if (nic != null && nic != caller.Nic)
                throw new ForbiddenException("You can only make bookings for your own account.");

            nic = caller.Nic;
        }

        var prosumer = await _users.GetByNicAsync(nic!);
        if (prosumer == null || prosumer.Role != UserRole.Prosumer)
            throw new NotFoundException("Prosumer not found.");

        if (prosumer.Status != AccountStatus.Active)
            throw new BusinessRuleException("Only active prosumer accounts can make bookings.");

        return prosumer;
    }

    // Loads a slot that can be booked now: open, at an active station, within the 7-day window.
    private async Task<(EnergySlot Slot, SolarStation Station)> GetBookableSlotAsync(string slotId)
    {
        var slot = await _slots.GetByIdAsync(slotId) ?? throw new NotFoundException("Slot not found.");
        if (!slot.IsOpen)
            throw new BusinessRuleException("This slot is closed for bookings.");

        var station = await _stations.GetByIdAsync(slot.StationId) ?? throw new NotFoundException("Station not found.");
        if (station.Status != StationStatus.Active)
            throw new BusinessRuleException("This station is not taking bookings right now.");

        var now = _clock.UtcNow;
        if (slot.StartTime <= now)
            throw new BusinessRuleException("This slot has already started. Please choose a later slot.");

        if (slot.StartTime > now + BookingWindow)
            throw new BusinessRuleException("Bookings can only be made up to 7 days in advance.");

        if (slot.AvailableBays == 0)
            throw new ConflictException("This slot is fully booked. Please choose another slot.");

        return (slot, station);
    }

    // One booking can use at most one battery bay's worth of energy.
    private static void EnsureEnergyFits(SolarStation station, double energyKwh)
    {
        var max = station.BayCapacityKwh();
        if (energyKwh <= 0 || energyKwh > max)
            throw new BusinessRuleException($"Energy must be more than 0 and at most {max} kWh for a slot at this station.");
    }

    // Changes and cancellations: only live bookings, and at least 12 hours before the start.
    private void EnsureChangeable(EnergyReservation reservation, string action)
    {
        if (reservation.Status is not (ReservationStatus.Pending or ReservationStatus.Approved))
            throw new BusinessRuleException($"Only pending or approved bookings can be {action}.");

        if (reservation.StartTime - _clock.UtcNow < ChangeNotice)
            throw new BusinessRuleException($"Bookings can only be {action} at least 12 hours before the start time.");
    }

    // Approval and rejection are staff actions.
    private static void EnsureStaff(CurrentUser caller)
    {
        if (!caller.IsStaff)
            throw new ForbiddenException("Only Backoffice or Grid Operator staff can do this.");
    }

    // Saves a status change unless someone else changed the booking first.
    private async Task SaveStatusChangeAsync(EnergyReservation reservation, ReservationStatus expectedStatus)
    {
        if (!await _reservations.ReplaceIfStatusAsync(reservation, expectedStatus))
            throw new ConflictException(ChangedElsewhereMessage);
    }

    // Loads a booking the caller is allowed to see. Other people's bookings look like missing ones.
    private async Task<EnergyReservation> GetAccessibleAsync(string id, CurrentUser caller)
    {
        var reservation = await GetReservationAsync(id);
        if (!caller.IsStaff && reservation.ProsumerNic != caller.Nic)
            throw new NotFoundException("Reservation not found.");

        return reservation;
    }

    // Loads a booking or reports 404.
    private async Task<EnergyReservation> GetReservationAsync(string id)
    {
        return await _reservations.GetByIdAsync(id) ?? throw new NotFoundException("Reservation not found.");
    }

    // Adds the rule flags the apps use to enable or hide buttons.
    private ReservationResponse ToResponse(EnergyReservation reservation)
    {
        return reservation.ToResponse(CanChange(reservation, _clock.UtcNow), reservation.StartTime - ChangeNotice);
    }

    // e.g. RSV-260920-K7P2Q
    private string NewReferenceNo()
    {
        return $"RSV-{_clock.LocalToday:yyMMdd}-{RandomNumberGenerator.GetString(ReferenceChars, 5)}";
    }

    // Different wording for prosumers and staff.
    private static string OverlapMessage(CurrentUser caller)
    {
        return caller.IsStaff
            ? "This prosumer already has a booking at this time."
            : "You already have a booking at this time.";
    }

    // Normalises an optional NIC; empty means "not given".
    private static string? NicOrNull(string? nic)
    {
        return string.IsNullOrWhiteSpace(nic) ? null : NicValidator.Normalize(nic);
    }

    // Keeps only the statuses allowed by the chosen list.
    private static ReservationStatus[] Narrow(ReservationStatus? requested, ReservationStatus scopeStatus)
    {
        return requested.HasValue && requested.Value != scopeStatus
            ? Array.Empty<ReservationStatus>()
            : new[] { scopeStatus };
    }

    // Empty optional text is stored as null.
    private static string? TrimOrNull(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
