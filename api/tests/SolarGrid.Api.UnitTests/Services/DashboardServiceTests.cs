/*
 * File:    DashboardServiceTests.cs
 * Module:  Unit Tests
 * Owner:   Malith
 * Purpose: Dashboard numbers for staff, prosumers and the public home page.
 */
using NSubstitute;
using SolarGrid.Api.Common;
using SolarGrid.Api.Models;
using SolarGrid.Api.Repositories;
using SolarGrid.Api.Security;
using SolarGrid.Api.Services;
using SolarGrid.Api.UnitTests.TestSupport;

namespace SolarGrid.Api.UnitTests.Services;

public class DashboardServiceTests
{
    private const string ProsumerNic = "200034501234";

    private readonly IReservationRepository _reservations = Substitute.For<IReservationRepository>();
    private readonly IStationRepository _stations = Substitute.For<IStationRepository>();
    private readonly IUserRepository _users = Substitute.For<IUserRepository>();
    private readonly AppClock _clock = TestClock.Create().Clock;
    private readonly DashboardService _service;

    // Wires the service to fake repositories.
    public DashboardServiceTests()
    {
        _service = new DashboardService(_reservations, _stations, _users, _clock);
    }

    // Each staff number comes from the matching repository query.
    [Fact]
    public async Task GetStaffSummaryAsync_ReturnsLiveCounts()
    {
        var now = _clock.UtcNow;
        _reservations.CountAsync(ReservationStatus.Pending, now).Returns(4L);
        _reservations.CountAsync(ReservationStatus.Approved, now).Returns(7L);
        _stations.CountAsync(StationStatus.Active).Returns(3L);
        _stations.CountAsync().Returns(5L);
        _users.CountAsync(UserRole.Prosumer, AccountStatus.Pending).Returns(2L);
        _users.CountAsync(UserRole.Prosumer, AccountStatus.Active).Returns(40L);
        _reservations.ListUpcomingAsync(now, 5).Returns(new List<EnergyReservation> { Booking("RSV-1") });

        var result = await _service.GetStaffSummaryAsync();

        Assert.Equal(4, result.PendingReservations);
        Assert.Equal(7, result.ApprovedFutureReservations);
        Assert.Equal(3, result.ActiveStations);
        Assert.Equal(5, result.TotalStations);
        Assert.Equal(2, result.PendingActivations);
        Assert.Equal(40, result.ActiveProsumers);
        Assert.Equal("RSV-1", Assert.Single(result.UpcomingReservations).ReferenceNo);
    }

    // "Today" runs from midnight to midnight in Sri Lanka, not in UTC.
    [Fact]
    public async Task GetStaffSummaryAsync_TodayUsesSriLankaMidnight()
    {
        var localMidnightUtc = new DateTime(2026, 9, 19, 18, 30, 0, DateTimeKind.Utc);
        _reservations.CountStartingBetweenAsync(localMidnightUtc, localMidnightUtc.AddDays(1)).Returns(9L);

        var result = await _service.GetStaffSummaryAsync();

        Assert.Equal(9, result.TodaysReservations);
    }

    // Prosumer numbers are filtered by the caller's NIC.
    [Fact]
    public async Task GetProsumerSummaryAsync_UsesCallerNic()
    {
        var now = _clock.UtcNow;
        _reservations.CountAsync(ReservationStatus.Pending, now, ProsumerNic).Returns(1L);
        _reservations.CountAsync(ReservationStatus.Approved, now, ProsumerNic).Returns(2L);
        _reservations.GetCompletedTotalsAsync(ProsumerNic).Returns((3L, 25.456));
        _reservations.ListUpcomingAsync(now, 5, ProsumerNic)
            .Returns(new List<EnergyReservation> { Booking("RSV-NEXT"), Booking("RSV-LATER") });

        var result = await _service.GetProsumerSummaryAsync(new CurrentUser(ProsumerNic, UserRole.Prosumer));

        Assert.Equal(1, result.PendingCount);
        Assert.Equal(2, result.ApprovedFutureCount);
        Assert.Equal(3, result.CompletedCount);
        Assert.Equal(25.46, result.TotalDeliveredKwh);
        Assert.Equal("RSV-NEXT", result.NextReservation?.ReferenceNo);
        Assert.Equal(2, result.UpcomingReservations.Count);
    }

    // With no upcoming bookings there is no "next" booking.
    [Fact]
    public async Task GetProsumerSummaryAsync_NoUpcoming_NextIsNull()
    {
        _reservations.ListUpcomingAsync(default, default, default).ReturnsForAnyArgs(new List<EnergyReservation>());

        var result = await _service.GetProsumerSummaryAsync(new CurrentUser(ProsumerNic, UserRole.Prosumer));

        Assert.Null(result.NextReservation);
        Assert.Empty(result.UpcomingReservations);
    }

    // The public summary shows totals without any personal data.
    [Fact]
    public async Task GetPublicSummaryAsync_ReturnsRoundedTotals()
    {
        _stations.CountAsync(StationStatus.Active).Returns(4L);
        _users.CountAsync(UserRole.Prosumer, AccountStatus.Active).Returns(12L);
        _reservations.GetCompletedTotalsAsync().Returns((10L, 123.456));

        var result = await _service.GetPublicSummaryAsync();

        Assert.Equal(4, result.ActiveStations);
        Assert.Equal(12, result.ActiveProsumers);
        Assert.Equal(10, result.CompletedTransfers);
        Assert.Equal(123.46, result.TotalEnergyTradedKwh);
    }

    // A booking starting tomorrow at the test clock.
    private EnergyReservation Booking(string reference)
    {
        return new EnergyReservation
        {
            Id = "6aaa95c6e007313fe4c19340",
            ReferenceNo = reference,
            ProsumerNic = ProsumerNic,
            ProsumerName = "Kasun Perera",
            StationName = "SLIIT Malabe Campus Microgrid",
            StartTime = _clock.UtcNow.AddDays(1),
            EndTime = _clock.UtcNow.AddDays(1).AddHours(2),
            TradeType = TradeType.Export,
            EnergyKwh = 10,
            Status = ReservationStatus.Approved
        };
    }
}
