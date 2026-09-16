/*
 * File:    CheckInService.cs
 * Module:  Operator Check-in
 * Owner:   Ravindu
 * Purpose: Business rules for checking a prosumer in at a station:
 *          - the QR code must be genuine (valid signature) and the latest one issued
 *          - only approved bookings can be completed
 *          - check-in is open from 2 hours before the start until 1 hour after the end
 *          - delivered energy cannot exceed one battery bay
 *          - a finished booking's QR code cannot be used again
 */
using System.Globalization;
using SolarGrid.Api.Common;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Models;
using SolarGrid.Api.Repositories;
using SolarGrid.Api.Security;

namespace SolarGrid.Api.Services;

public class CheckInService : ICheckInService
{
    public static readonly TimeSpan OpensBeforeStart = TimeSpan.FromHours(2);
    public static readonly TimeSpan ClosesAfterEnd = TimeSpan.FromHours(1);

    private readonly IReservationRepository _reservations;
    private readonly IStationRepository _stations;
    private readonly IUserRepository _users;
    private readonly IQrTokenService _qr;
    private readonly AppClock _clock;
    private readonly ILogger<CheckInService> _logger;

    // Needs the reservation, station and user stores, the QR service, the clock and a logger.
    public CheckInService(IReservationRepository reservations, IStationRepository stations, IUserRepository users,
        IQrTokenService qr, AppClock clock, ILogger<CheckInService> logger)
    {
        _reservations = reservations;
        _stations = stations;
        _users = users;
        _qr = qr;
        _clock = clock;
        _logger = logger;
    }

    // Checks a scanned code and tells the operator whether the transfer can go ahead.
    public async Task<CheckInResponse> VerifyAsync(VerifyQrRequest request, CurrentUser caller)
    {
        EnsureStaff(caller);
        var reservation = await ReadGenuineCodeAsync(request.Payload);
        var (canComplete, message) = Evaluate(reservation);
        var prosumer = await _users.GetByNicAsync(reservation.ProsumerNic);

        _logger.LogInformation("QR for {Reference} checked by {Operator}: {Result}",
            reservation.ReferenceNo, caller.Nic, canComplete ? "ready" : message);

        return new CheckInResponse
        {
            CanComplete = canComplete,
            Message = message,
            ProsumerPhone = prosumer?.Phone ?? string.Empty,
            CheckInOpensAt = reservation.StartTime - OpensBeforeStart,
            CheckInClosesAt = reservation.EndTime + ClosesAfterEnd,
            Reservation = ToResponse(reservation)
        };
    }

    // Finishes the transfer after checking the code again, and records the delivered energy.
    public async Task<ReservationResponse> CompleteAsync(string reservationId, CompleteTransferRequest request, CurrentUser caller)
    {
        EnsureStaff(caller);
        var reservation = await ReadGenuineCodeAsync(request.Payload);
        if (reservation.Id != reservationId)
            throw new BusinessRuleException("This QR code belongs to a different booking.");

        var (canComplete, message) = Evaluate(reservation);
        if (!canComplete)
            throw new BusinessRuleException(message);

        var station = await _stations.GetByIdAsync(reservation.StationId)
            ?? throw new NotFoundException("Station not found.");

        var delivered = request.DeliveredKwh!.Value;
        var maxKwh = station.BayCapacityKwh();
        if (delivered <= 0 || delivered > maxKwh)
            throw new BusinessRuleException($"Delivered energy must be more than 0 and at most {maxKwh} kWh.");

        var now = _clock.UtcNow;
        reservation.Status = ReservationStatus.Completed;
        reservation.DeliveredKwh = Math.Round(delivered, 2);
        reservation.CompletedBy = caller.Nic;
        reservation.CompletedAt = now;
        reservation.QrNonce = null;
        reservation.UpdatedAt = now;

        if (!await _reservations.ReplaceIfStatusAsync(reservation, ReservationStatus.Approved))
            throw new ConflictException("This booking was changed at the same moment. Please scan the code again.");

        _logger.LogInformation("Reservation {Reference} completed by {Operator} with {Kwh} kWh.",
            reservation.ReferenceNo, caller.Nic, reservation.DeliveredKwh);
        return ToResponse(reservation);
    }

    // Reads the QR text and makes sure it was issued by this server for this booking.
    private async Task<EnergyReservation> ReadGenuineCodeAsync(string payload)
    {
        if (!_qr.TryRead(payload, out var qr))
            throw new BusinessRuleException("This is not a Smart Solar booking QR code.");

        var reservation = await _reservations.GetByIdAsync(qr.ReservationId)
            ?? throw new NotFoundException("Booking not found.");

        if (!_qr.IsSignatureValid(qr, reservation.ProsumerNic))
            throw new BusinessRuleException("This QR code is not genuine.");

        // A changed booking gets a new code when it is approved again; older codes stop working.
        if (reservation.Status == ReservationStatus.Approved && reservation.QrNonce != qr.Nonce)
            throw new BusinessRuleException("This QR code is out of date. Ask the prosumer to open the latest code in the app.");

        return reservation;
    }

    // Decides whether the transfer can happen now, with a message for the operator.
    private (bool CanComplete, string Message) Evaluate(EnergyReservation reservation)
    {
        switch (reservation.Status)
        {
            case ReservationStatus.Completed:
                return (false, "This booking has already been completed.");
            case ReservationStatus.Cancelled:
                return (false, "This booking was cancelled.");
            case ReservationStatus.Rejected:
                return (false, "This booking was rejected.");
            case ReservationStatus.Pending:
                return (false, "This booking is waiting for approval.");
        }

        var now = _clock.UtcNow;
        var opensAt = reservation.StartTime - OpensBeforeStart;
        if (now < opensAt)
        {
            var local = _clock.ToLocal(opensAt);
            return (false, "Check-in for this booking opens at "
                + local.ToString("HH:mm 'on' dd MMM yyyy", CultureInfo.InvariantCulture) + ".");
        }

        if (now > reservation.EndTime + ClosesAfterEnd)
            return (false, "The check-in time for this booking has passed.");

        var action = reservation.TradeType == TradeType.Export ? "export" : "import";
        return (true, $"Valid booking. {reservation.ProsumerName} can {action} up to {reservation.EnergyKwh} kWh.");
    }

    // Check-in is a staff task.
    private static void EnsureStaff(CurrentUser caller)
    {
        if (!caller.IsStaff)
            throw new ForbiddenException("Only Backoffice or Grid Operator staff can check in bookings.");
    }

    // Uses the booking rules to fill the response flags.
    private ReservationResponse ToResponse(EnergyReservation reservation)
    {
        return reservation.ToResponse(
            ReservationService.CanChange(reservation, _clock.UtcNow),
            reservation.StartTime - ReservationService.ChangeNotice);
    }
}
