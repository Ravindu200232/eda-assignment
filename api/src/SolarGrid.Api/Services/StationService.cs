/*
 * File:    StationService.cs
 * Module:  Microgrid Stations
 * Owner:   Nimthara
 * Purpose: Business rules for microgrid stations:
 *          - unique station codes and valid GPS, capacity and schedule values
 *          - available battery slots never exceed the physical slots
 *          - a station with active reservations cannot be deactivated
 *          - only stations that were never booked can be deleted
 *          - prosumers only see active stations
 */
using MongoDB.Bson;
using SolarGrid.Api.Common;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Models;
using SolarGrid.Api.Repositories;
using SolarGrid.Api.Security;

namespace SolarGrid.Api.Services;

public class StationService : IStationService
{
    public const double DefaultRadiusKm = 10;
    public const double MaxRadiusKm = 500;
    private const int NearbyLimit = 20;
    private const int MinOpenMinutes = 30;

    private readonly IStationRepository _stations;
    private readonly ISlotRepository _slots;
    private readonly IReservationRepository _reservations;
    private readonly AppClock _clock;

    // Needs the station, slot and reservation stores and the clock.
    public StationService(IStationRepository stations, ISlotRepository slots, IReservationRepository reservations, AppClock clock)
    {
        _stations = stations;
        _slots = slots;
        _reservations = reservations;
        _clock = clock;
    }

    // Staff see every station; prosumers only see active ones.
    public async Task<IReadOnlyList<StationResponse>> ListAsync(StationStatus? status, string? search, CurrentUser caller)
    {
        var effectiveStatus = caller.IsStaff ? status : StationStatus.Active;
        var stations = await _stations.ListAsync(effectiveStatus, search);
        return stations.Select(s => s.ToResponse()).ToList();
    }

    // One station. Inactive stations are hidden from prosumers.
    public async Task<StationResponse> GetAsync(string id, CurrentUser caller)
    {
        var station = await GetStationAsync(id);
        if (!caller.IsStaff && station.Status != StationStatus.Active)
            throw new NotFoundException("Station not found.");

        return station.ToResponse();
    }

    // Active stations around a GPS point, nearest first.
    public async Task<IReadOnlyList<NearbyStationResponse>> FindNearbyAsync(double? latitude, double? longitude, double? radiusKm)
    {
        if (latitude is null or < -90 or > 90 || longitude is null or < -180 or > 180)
            throw new BusinessRuleException("A valid latitude and longitude are required.");

        var radius = radiusKm ?? DefaultRadiusKm;
        if (radius is <= 0 or > MaxRadiusKm)
            throw new BusinessRuleException($"Search radius must be more than 0 and at most {MaxRadiusKm} km.");

        var results = await _stations.FindNearbyAsync(latitude.Value, longitude.Value, radius, NearbyLimit);
        return results.Select(r => r.Station.ToNearbyResponse(r.DistanceKm)).ToList();
    }

    // Registers a new station. All battery slots start as available.
    public async Task<StationResponse> CreateAsync(StationRequest request)
    {
        var code = NormalizeCode(request.Code);
        if (await _stations.GetByCodeAsync(code) != null)
            throw new ConflictException($"A station with code {code} already exists.");

        var schedule = request.Schedule is { Count: > 0 }
            ? BuildSchedule(request.Schedule)
            : DefaultSchedule();

        var now = _clock.UtcNow;
        var station = new SolarStation
        {
            Id = ObjectId.GenerateNewId().ToString(),
            Code = code,
            Schedule = schedule,
            Status = StationStatus.Active,
            AvailableBatterySlots = request.TotalBatterySlots!.Value,
            CreatedAt = now
        };
        ApplyDetails(station, request);

        await _stations.InsertAsync(station);
        return station.ToResponse();
    }

    // Updates details and location. Available slots shrink if the total drops below them.
    public async Task<StationResponse> UpdateAsync(string id, StationRequest request)
    {
        var station = await GetStationAsync(id);
        var code = NormalizeCode(request.Code);

        if (code != station.Code && await _stations.GetByCodeAsync(code) != null)
            throw new ConflictException($"A station with code {code} already exists.");

        station.Code = code;
        ApplyDetails(station, request);
        station.AvailableBatterySlots = Math.Min(station.AvailableBatterySlots, station.TotalBatterySlots);

        await _stations.UpdateAsync(station);
        return station.ToResponse();
    }

    // Replaces the weekly opening hours. Existing slots are not changed.
    public async Task<StationResponse> UpdateScheduleAsync(string id, ScheduleRequest request)
    {
        var station = await GetStationAsync(id);
        station.Schedule = BuildSchedule(request.Schedule);
        station.UpdatedAt = _clock.UtcNow;

        await _stations.UpdateAsync(station);
        return station.ToResponse();
    }

    // Grid Operators set how many battery slots can be used right now.
    public async Task<StationResponse> UpdateBatterySlotsAsync(string id, BatterySlotsRequest request)
    {
        var station = await GetStationAsync(id);
        var available = request.AvailableBatterySlots!.Value;

        if (available < 0 || available > station.TotalBatterySlots)
            throw new BusinessRuleException(
                $"Available battery slots must be between 0 and the station's {station.TotalBatterySlots} slots.");

        station.AvailableBatterySlots = available;
        station.UpdatedAt = _clock.UtcNow;

        await _stations.UpdateAsync(station);
        return station.ToResponse();
    }

    // Deactivation is blocked while bookings are still waiting at this station.
    public async Task<StationResponse> DeactivateAsync(string id)
    {
        var station = await GetStationAsync(id);
        if (station.Status == StationStatus.Inactive)
            throw new BusinessRuleException("This station is already inactive.");

        var now = _clock.UtcNow;
        if (await _reservations.HasActiveForStationAsync(station.Id, now))
            throw new BusinessRuleException(
                "This station has active reservations. Cancel or complete them before deactivating the station.");

        station.Status = StationStatus.Inactive;
        station.UpdatedAt = now;

        await _stations.UpdateAsync(station);
        return station.ToResponse();
    }

    // Brings an inactive station back into service.
    public async Task<StationResponse> ActivateAsync(string id)
    {
        var station = await GetStationAsync(id);
        if (station.Status == StationStatus.Active)
            throw new BusinessRuleException("This station is already active.");

        station.Status = StationStatus.Active;
        station.UpdatedAt = _clock.UtcNow;

        await _stations.UpdateAsync(station);
        return station.ToResponse();
    }

    // Deletes a station that was never booked, together with its empty slots.
    // Stations with booking history are kept for the records and can only be deactivated.
    public async Task DeleteAsync(string id)
    {
        var station = await GetStationAsync(id);
        if (await _reservations.AnyForStationAsync(station.Id))
            throw new BusinessRuleException(
                "This station has booking history and cannot be deleted. Deactivate it instead.");

        await _slots.DeleteByStationAsync(station.Id);
        await _stations.DeleteAsync(station.Id);
    }

    // Checks the weekly hours and turns them into stored entries.
    public static List<OperatingHours> BuildSchedule(IReadOnlyCollection<OperatingHoursDto> entries)
    {
        if (entries.Count == 0)
            throw new BusinessRuleException("Add at least one opening day.");

        if (entries.Any(e => e.Day == null))
            throw new BusinessRuleException("Every schedule entry needs a day.");

        if (entries.GroupBy(e => e.Day).Any(g => g.Count() > 1))
            throw new BusinessRuleException("Each day can appear only once in the schedule.");

        var schedule = new List<OperatingHours>();
        foreach (var entry in entries.OrderBy(e => e.Day))
        {
            var hours = new OperatingHours { Day = entry.Day!.Value, OpenTime = entry.OpenTime.Trim(), CloseTime = entry.CloseTime.Trim() };

            if (hours.OpenMinutes < 0 || hours.CloseMinutes < 0)
                throw new BusinessRuleException($"{hours.Day}: times must be in HH:mm format between 00:00 and 24:00.");

            if (hours.CloseMinutes - hours.OpenMinutes < MinOpenMinutes)
                throw new BusinessRuleException($"{hours.Day}: closing time must be at least 30 minutes after opening time.");

            schedule.Add(hours);
        }

        return schedule;
    }

    // 06:00 to 18:00 on every day of the week.
    private static List<OperatingHours> DefaultSchedule()
    {
        return Enum.GetValues<DayOfWeek>()
            .Select(day => new OperatingHours { Day = day, OpenTime = "06:00", CloseTime = "18:00" })
            .ToList();
    }

    // Copies the editable fields from a request.
    private void ApplyDetails(SolarStation station, StationRequest request)
    {
        station.Name = request.Name.Trim();
        station.Address = request.Address.Trim();
        station.Location = SolarStation.ToPoint(request.Latitude!.Value, request.Longitude!.Value);
        station.SolarCapacityKw = request.SolarCapacityKw!.Value;
        station.StorageCapacityKwh = request.StorageCapacityKwh!.Value;
        station.TotalBatterySlots = request.TotalBatterySlots!.Value;
        station.UpdatedAt = _clock.UtcNow;
    }

    // Loads a station or reports 404.
    private async Task<SolarStation> GetStationAsync(string id)
    {
        return await _stations.GetByIdAsync(id) ?? throw new NotFoundException("Station not found.");
    }

    // Station codes are stored in upper case.
    private static string NormalizeCode(string code)
    {
        return code.Trim().ToUpperInvariant();
    }
}
