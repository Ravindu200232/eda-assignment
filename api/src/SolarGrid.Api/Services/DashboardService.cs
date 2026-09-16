/*
 * File:    DashboardService.cs
 * Module:  Dashboards
 * Owner:   Malith
 * Purpose: Builds dashboard numbers straight from the database on every call,
 *          so the web and mobile dashboards never show stale values.
 *          "Today" means today in Sri Lanka time.
 */
using SolarGrid.Api.Common;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Models;
using SolarGrid.Api.Repositories;
using SolarGrid.Api.Security;

namespace SolarGrid.Api.Services;

public class DashboardService : IDashboardService
{
    private const int UpcomingLimit = 5;

    private readonly IReservationRepository _reservations;
    private readonly IStationRepository _stations;
    private readonly IUserRepository _users;
    private readonly AppClock _clock;

    // Needs the reservation, station and user stores and the clock.
    public DashboardService(IReservationRepository reservations, IStationRepository stations,
        IUserRepository users, AppClock clock)
    {
        _reservations = reservations;
        _stations = stations;
        _users = users;
        _clock = clock;
    }

    // Operations overview for Backoffice and Grid Operators.
    public async Task<StaffDashboardResponse> GetStaffSummaryAsync()
    {
        var now = _clock.UtcNow;
        var todayStart = _clock.ToUtc(_clock.LocalToday, 0);
        var tomorrowStart = _clock.ToUtc(_clock.LocalToday.AddDays(1), 0);
        var upcoming = await _reservations.ListUpcomingAsync(now, UpcomingLimit);

        return new StaffDashboardResponse
        {
            PendingReservations = await _reservations.CountAsync(ReservationStatus.Pending, now),
            ApprovedFutureReservations = await _reservations.CountAsync(ReservationStatus.Approved, now),
            TodaysReservations = await _reservations.CountStartingBetweenAsync(todayStart, tomorrowStart),
            ActiveStations = await _stations.CountAsync(StationStatus.Active),
            TotalStations = await _stations.CountAsync(),
            PendingActivations = await _users.CountAsync(UserRole.Prosumer, AccountStatus.Pending),
            ActiveProsumers = await _users.CountAsync(UserRole.Prosumer, AccountStatus.Active),
            UpcomingReservations = upcoming.Select(r => r.ToSummary()).ToList(),
            GeneratedAt = now
        };
    }

    // Personal overview for the signed-in prosumer.
    public async Task<ProsumerDashboardResponse> GetProsumerSummaryAsync(CurrentUser caller)
    {
        var now = _clock.UtcNow;
        var upcoming = await _reservations.ListUpcomingAsync(now, UpcomingLimit, caller.Nic);
        var completed = await _reservations.GetCompletedTotalsAsync(caller.Nic);

        return new ProsumerDashboardResponse
        {
            PendingCount = await _reservations.CountAsync(ReservationStatus.Pending, now, caller.Nic),
            ApprovedFutureCount = await _reservations.CountAsync(ReservationStatus.Approved, now, caller.Nic),
            CompletedCount = completed.Count,
            TotalDeliveredKwh = Math.Round(completed.TotalKwh, 2),
            NextReservation = upcoming.FirstOrDefault()?.ToSummary(),
            UpcomingReservations = upcoming.Select(r => r.ToSummary()).ToList(),
            GeneratedAt = now
        };
    }

    // Headline numbers for the public home page.
    public async Task<PublicSummaryResponse> GetPublicSummaryAsync()
    {
        var completed = await _reservations.GetCompletedTotalsAsync();

        return new PublicSummaryResponse
        {
            ActiveStations = await _stations.CountAsync(StationStatus.Active),
            ActiveProsumers = await _users.CountAsync(UserRole.Prosumer, AccountStatus.Active),
            CompletedTransfers = completed.Count,
            TotalEnergyTradedKwh = Math.Round(completed.TotalKwh, 2)
        };
    }
}
