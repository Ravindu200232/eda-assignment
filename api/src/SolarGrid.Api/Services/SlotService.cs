/*
 * File:    SlotService.cs
 * Module:  Energy Slots
 * Owner:   Nimthara
 * Purpose: Business rules for energy slots:
 *          - slots are in the future, inside the station's opening hours and never overlap
 *          - capacity is limited by the station's available battery slots
 *          - booked slots cannot be closed, deleted or shrunk below their bookings
 *          - prosumers only see open future slots with free bays
 */
using MongoDB.Bson;
using SolarGrid.Api.Common;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Models;
using SolarGrid.Api.Repositories;
using SolarGrid.Api.Security;

namespace SolarGrid.Api.Services;

public class SlotService : ISlotService
{
    private const int MaxDaysAhead = 30;
    private const int MaxListDays = 31;
    private const int MinSlotMinutes = 30;
    private const int MaxSlotMinutes = 12 * 60;

    private readonly ISlotRepository _slots;
    private readonly IStationRepository _stations;
    private readonly AppClock _clock;

    // Needs the slot and station stores and the clock.
    public SlotService(ISlotRepository slots, IStationRepository stations, AppClock clock)
    {
        _slots = slots;
        _stations = stations;
        _clock = clock;
    }

    // Slots of a station between two local dates (both included). Default: the next 7 days.
    public async Task<IReadOnlyList<SlotResponse>> ListForStationAsync(string stationId, DateOnly? from, DateOnly? to,
        bool onlyAvailable, CurrentUser caller)
    {
        var station = await GetStationAsync(stationId);
        if (!caller.IsStaff && station.Status != StationStatus.Active)
            throw new NotFoundException("Station not found.");

        var firstDay = from ?? _clock.LocalToday;
        var lastDay = to ?? firstDay.AddDays(6);
        if (lastDay < firstDay)
            throw new BusinessRuleException("The end date must be on or after the start date.");

        if (lastDay.DayNumber - firstDay.DayNumber >= MaxListDays)
            throw new BusinessRuleException($"Slots can be listed for at most {MaxListDays} days at a time.");

        var slots = await _slots.ListByStationAsync(station.Id, _clock.ToUtc(firstDay, 0), _clock.ToUtc(lastDay.AddDays(1), 0));

        // Prosumers only ever see slots they could book.
        var now = _clock.UtcNow;
        if (onlyAvailable || !caller.IsStaff)
            slots = slots.Where(s => s.IsOpen && s.AvailableBays > 0 && s.StartTime > now).ToList();

        return slots.Select(s => s.ToResponse()).ToList();
    }

    // One slot.
    public async Task<SlotResponse> GetAsync(string id)
    {
        var slot = await GetSlotAsync(id);
        return slot.ToResponse();
    }

    // Adds a single slot on a local date, e.g. 2026-09-20 from 08:00 to 10:00.
    public async Task<SlotResponse> CreateAsync(string stationId, CreateSlotRequest request)
    {
        var station = await GetActiveStationAsync(stationId);
        var date = request.Date!.Value;
        var startMinutes = OperatingHours.ToMinutes(request.StartTime);
        var endMinutes = OperatingHours.ToMinutes(request.EndTime);

        if (startMinutes < 0 || endMinutes < 0)
            throw new BusinessRuleException(SlotPatterns.TimeMessage);

        EnsureLength(endMinutes - startMinutes);
        EnsureDateInRange(date);
        EnsureWithinSchedule(station, date, startMinutes, endMinutes);

        var startUtc = _clock.ToUtc(date, startMinutes);
        var endUtc = _clock.ToUtc(date, endMinutes);
        if (startUtc <= _clock.UtcNow)
            throw new BusinessRuleException("Slots must start in the future.");

        if (await _slots.HasOverlapAsync(station.Id, startUtc, endUtc))
            throw new ConflictException("This time overlaps another slot at the station.");

        var slot = NewSlot(station, startUtc, endUtc, ResolveCapacity(station, request.Capacity));
        await _slots.InsertAsync(slot);
        return slot.ToResponse();
    }

    // Fills up to 7 days with equal slots inside the opening hours, skipping times already taken.
    public async Task<GenerateSlotsResponse> GenerateAsync(string stationId, GenerateSlotsRequest request)
    {
        var station = await GetActiveStationAsync(stationId);
        var capacity = ResolveCapacity(station, request.Capacity);
        var firstDay = request.FromDate ?? _clock.LocalToday;
        EnsureDateInRange(firstDay);

        var now = _clock.UtcNow;
        var rangeStart = _clock.ToUtc(firstDay, 0);
        var rangeEnd = _clock.ToUtc(firstDay.AddDays(request.Days), 0);

        // Look a little earlier too, in case a long slot from the day before runs past midnight.
        var taken = (await _slots.ListByStationAsync(station.Id, rangeStart.AddHours(-12), rangeEnd)).ToList();
        var created = new List<EnergySlot>();
        var skipped = 0;

        for (var day = firstDay; day < firstDay.AddDays(request.Days); day = day.AddDays(1))
        {
            var hours = station.Schedule.FirstOrDefault(h => h.Day == day.DayOfWeek);
            if (hours == null)
                continue;

            for (var start = hours.OpenMinutes; start + request.SlotMinutes <= hours.CloseMinutes; start += request.SlotMinutes)
            {
                var startUtc = _clock.ToUtc(day, start);
                var endUtc = _clock.ToUtc(day, start + request.SlotMinutes);

                if (startUtc <= now || taken.Any(s => s.StartTime < endUtc && s.EndTime > startUtc))
                {
                    skipped++;
                    continue;
                }

                var slot = NewSlot(station, startUtc, endUtc, capacity);
                created.Add(slot);
                taken.Add(slot);
            }
        }

        if (created.Count > 0)
            await _slots.InsertManyAsync(created);

        return new GenerateSlotsResponse
        {
            Created = created.Count,
            Skipped = skipped,
            Slots = created.Select(s => s.ToResponse()).ToList()
        };
    }

    // Changes capacity or opens/closes a slot without breaking existing bookings.
    public async Task<SlotResponse> UpdateAsync(string id, UpdateSlotRequest request)
    {
        var slot = await GetSlotAsync(id);
        if (slot.EndTime <= _clock.UtcNow)
            throw new BusinessRuleException("Past slots cannot be changed.");

        var station = await GetStationAsync(slot.StationId);
        var capacity = request.Capacity!.Value;
        var isOpen = request.IsOpen!.Value;

        if (capacity < slot.BookedCount)
            throw new BusinessRuleException($"Capacity cannot be lower than the {slot.BookedCount} bays already booked.");

        if (capacity > station.TotalBatterySlots)
            throw new BusinessRuleException($"Capacity cannot be more than the station's {station.TotalBatterySlots} battery slots.");

        if (!isOpen && slot.BookedCount > 0)
            throw new BusinessRuleException("This slot has bookings. Cancel them before closing the slot.");

        slot.Capacity = capacity;
        slot.IsOpen = isOpen;
        slot.UpdatedAt = _clock.UtcNow;

        await _slots.UpdateAsync(slot);
        return slot.ToResponse();
    }

    // Removes a slot that nobody has booked.
    public async Task DeleteAsync(string id)
    {
        var slot = await GetSlotAsync(id);
        if (slot.BookedCount > 0)
            throw new BusinessRuleException("This slot has bookings and cannot be deleted.");

        await _slots.DeleteAsync(slot.Id);
    }

    // Uses the requested capacity or all available battery slots.
    private static int ResolveCapacity(SolarStation station, int? requested)
    {
        if (station.AvailableBatterySlots == 0)
            throw new BusinessRuleException("No battery slots are available at this station right now.");

        var capacity = requested ?? station.AvailableBatterySlots;
        if (capacity > station.AvailableBatterySlots)
            throw new BusinessRuleException(
                $"Capacity cannot be more than the {station.AvailableBatterySlots} available battery slots.");

        return capacity;
    }

    // Slots must be between 30 minutes and 12 hours long.
    private static void EnsureLength(int minutes)
    {
        if (minutes < MinSlotMinutes || minutes > MaxSlotMinutes)
            throw new BusinessRuleException("A slot must be between 30 minutes and 12 hours long, and end after it starts.");
    }

    // Slots can be prepared from today up to 30 days ahead.
    private void EnsureDateInRange(DateOnly date)
    {
        var today = _clock.LocalToday;
        if (date < today)
            throw new BusinessRuleException("Slots cannot be created for past dates.");

        if (date > today.AddDays(MaxDaysAhead))
            throw new BusinessRuleException($"Slots can be created at most {MaxDaysAhead} days ahead.");
    }

    // The slot has to fit inside the station's opening hours for that weekday.
    private static void EnsureWithinSchedule(SolarStation station, DateOnly date, int startMinutes, int endMinutes)
    {
        var hours = station.Schedule.FirstOrDefault(h => h.Day == date.DayOfWeek);
        if (hours == null)
            throw new BusinessRuleException($"The station is closed on {date.DayOfWeek}s.");

        if (startMinutes < hours.OpenMinutes || endMinutes > hours.CloseMinutes)
            throw new BusinessRuleException(
                $"The station is open from {hours.OpenTime} to {hours.CloseTime} on {date.DayOfWeek}s.");
    }

    // Builds a new open slot with no bookings.
    private EnergySlot NewSlot(SolarStation station, DateTime startUtc, DateTime endUtc, int capacity)
    {
        var now = _clock.UtcNow;
        return new EnergySlot
        {
            Id = ObjectId.GenerateNewId().ToString(),
            StationId = station.Id,
            StartTime = startUtc,
            EndTime = endUtc,
            Capacity = capacity,
            BookedCount = 0,
            IsOpen = true,
            CreatedAt = now,
            UpdatedAt = now
        };
    }

    // Loads a station that can take new slots.
    private async Task<SolarStation> GetActiveStationAsync(string stationId)
    {
        var station = await GetStationAsync(stationId);
        if (station.Status != StationStatus.Active)
            throw new BusinessRuleException("Slots can only be added to active stations.");

        return station;
    }

    // Loads a station or reports 404.
    private async Task<SolarStation> GetStationAsync(string stationId)
    {
        return await _stations.GetByIdAsync(stationId) ?? throw new NotFoundException("Station not found.");
    }

    // Loads a slot or reports 404.
    private async Task<EnergySlot> GetSlotAsync(string id)
    {
        return await _slots.GetByIdAsync(id) ?? throw new NotFoundException("Slot not found.");
    }
}
