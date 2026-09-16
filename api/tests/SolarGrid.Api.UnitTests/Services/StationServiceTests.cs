/*
 * File:    StationServiceTests.cs
 * Module:  Unit Tests
 * Owner:   Nimthara
 * Purpose: Rules for creating, updating, deactivating and searching stations.
 */
using NSubstitute;
using SolarGrid.Api.Common;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Models;
using SolarGrid.Api.Repositories;
using SolarGrid.Api.Security;
using SolarGrid.Api.Services;
using SolarGrid.Api.UnitTests.TestSupport;

namespace SolarGrid.Api.UnitTests.Services;

public class StationServiceTests
{
    private readonly IStationRepository _stations = Substitute.For<IStationRepository>();
    private readonly IReservationRepository _reservations = Substitute.For<IReservationRepository>();
    private readonly AppClock _clock = TestClock.Create().Clock;
    private readonly StationService _service;
    private readonly CurrentUser _admin = new("198512345678", UserRole.Backoffice);
    private readonly CurrentUser _prosumer = new("200034501234", UserRole.Prosumer);

    // Wires the service to fake repositories.
    public StationServiceTests()
    {
        _service = new StationService(_stations, _reservations, _clock);
    }

    // A new station is active, uses an upper-case code and has every slot available.
    [Fact]
    public async Task CreateAsync_ValidRequest_SavesActiveStation()
    {
        var result = await _service.CreateAsync(NewRequest());

        Assert.Equal("SSG-GAL-02", result.Code);
        Assert.Equal(StationStatus.Active, result.Status);
        Assert.Equal(10, result.AvailableBatterySlots);
        Assert.Equal(6.0269, result.Latitude);
        Assert.Equal(80.217, result.Longitude);
        Assert.Equal(40, result.BayCapacityKwh);
        Assert.Equal(7, result.Schedule.Count);
        Assert.All(result.Schedule, h => Assert.Equal("06:00", h.OpenTime));
        await _stations.Received(1).InsertAsync(Arg.Is<SolarStation>(s => s.CreatedAt == _clock.UtcNow));
    }

    // A given schedule replaces the default one.
    [Fact]
    public async Task CreateAsync_WithSchedule_UsesOnlyGivenDays()
    {
        var request = NewRequest();
        request.Schedule = new List<OperatingHoursDto> { Hours(DayOfWeek.Monday, "07:00", "19:00") };

        var result = await _service.CreateAsync(request);

        var monday = Assert.Single(result.Schedule);
        Assert.Equal(DayOfWeek.Monday, monday.Day);
        Assert.Equal("19:00", monday.CloseTime);
    }

    // Station codes must be unique.
    [Fact]
    public async Task CreateAsync_DuplicateCode_ThrowsConflict()
    {
        _stations.GetByCodeAsync("SSG-GAL-02").Returns(TestStations.Station());

        await Assert.ThrowsAsync<ConflictException>(() => _service.CreateAsync(NewRequest()));
    }

    // A day may appear only once.
    [Fact]
    public void BuildSchedule_DuplicateDay_Throws()
    {
        var entries = new[] { Hours(DayOfWeek.Monday, "06:00", "12:00"), Hours(DayOfWeek.Monday, "13:00", "18:00") };

        var error = Assert.Throws<BusinessRuleException>(() => StationService.BuildSchedule(entries));

        Assert.Contains("only once", error.Message);
    }

    // Closing must be at least 30 minutes after opening.
    [Theory]
    [InlineData("18:00", "06:00")]
    [InlineData("08:00", "08:00")]
    [InlineData("08:00", "08:20")]
    public void BuildSchedule_CloseNotAfterOpen_Throws(string open, string close)
    {
        Assert.Throws<BusinessRuleException>(() => StationService.BuildSchedule(new[] { Hours(DayOfWeek.Friday, open, close) }));
    }

    // Times must be real clock times.
    [Theory]
    [InlineData("25:00", "26:00")]
    [InlineData("6am", "18:00")]
    public void BuildSchedule_InvalidTime_Throws(string open, string close)
    {
        var error = Assert.Throws<BusinessRuleException>(() => StationService.BuildSchedule(new[] { Hours(DayOfWeek.Friday, open, close) }));

        Assert.Contains("HH:mm", error.Message);
    }

    // A 24-hour station uses 00:00 to 24:00.
    [Fact]
    public void BuildSchedule_FullDay_IsAllowed()
    {
        var schedule = StationService.BuildSchedule(new[] { Hours(DayOfWeek.Sunday, "00:00", "24:00") });

        Assert.Equal(1440, Assert.Single(schedule).CloseMinutes);
    }

    // Changing to a code that another station uses is refused.
    [Fact]
    public async Task UpdateAsync_ChangedCodeTaken_ThrowsConflict()
    {
        _stations.GetByIdAsync(TestStations.StationId).Returns(TestStations.Station());
        var other = TestStations.Station();
        other.Id = "6aaa95c6e007313fe4c19999";
        _stations.GetByCodeAsync("SSG-GAL-02").Returns(other);

        await Assert.ThrowsAsync<ConflictException>(() => _service.UpdateAsync(TestStations.StationId, NewRequest()));
    }

    // Fewer physical slots also lowers the available count.
    [Fact]
    public async Task UpdateAsync_TotalBelowAvailable_ShrinksAvailable()
    {
        var station = TestStations.Station();
        _stations.GetByIdAsync(TestStations.StationId).Returns(station);
        var request = NewRequest();
        request.Code = station.Code;
        request.TotalBatterySlots = 3;

        var result = await _service.UpdateAsync(TestStations.StationId, request);

        Assert.Equal(3, result.TotalBatterySlots);
        Assert.Equal(3, result.AvailableBatterySlots);
        await _stations.Received(1).UpdateAsync(station);
    }

    // Available slots cannot exceed the physical slots.
    [Fact]
    public async Task UpdateBatterySlotsAsync_MoreThanTotal_Throws()
    {
        _stations.GetByIdAsync(TestStations.StationId).Returns(TestStations.Station());

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.UpdateBatterySlotsAsync(TestStations.StationId,
            new BatterySlotsRequest { AvailableBatterySlots = 9 }));
    }

    // Operators can take bays out of service.
    [Fact]
    public async Task UpdateBatterySlotsAsync_Valid_SavesNewValue()
    {
        var station = TestStations.Station();
        _stations.GetByIdAsync(TestStations.StationId).Returns(station);

        var result = await _service.UpdateBatterySlotsAsync(TestStations.StationId, new BatterySlotsRequest { AvailableBatterySlots = 0 });

        Assert.Equal(0, result.AvailableBatterySlots);
        await _stations.Received(1).UpdateAsync(station);
    }

    // Active reservations block deactivation.
    [Fact]
    public async Task DeactivateAsync_WithActiveReservations_Throws()
    {
        _stations.GetByIdAsync(TestStations.StationId).Returns(TestStations.Station());
        _reservations.HasActiveForStationAsync(TestStations.StationId, _clock.UtcNow).Returns(true);

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => _service.DeactivateAsync(TestStations.StationId));

        Assert.Contains("active reservations", error.Message);
        await _stations.DidNotReceiveWithAnyArgs().UpdateAsync(default!);
    }

    // Without active reservations the station becomes inactive.
    [Fact]
    public async Task DeactivateAsync_NoReservations_SetsInactive()
    {
        var station = TestStations.Station();
        _stations.GetByIdAsync(TestStations.StationId).Returns(station);

        var result = await _service.DeactivateAsync(TestStations.StationId);

        Assert.Equal(StationStatus.Inactive, result.Status);
    }

    // Repeating a status change is reported.
    [Fact]
    public async Task StatusChanges_ToSameStatus_Throw()
    {
        _stations.GetByIdAsync(TestStations.StationId).Returns(TestStations.Station());
        _stations.GetByIdAsync("6aaa95c6e007313fe4c19998").Returns(TestStations.Station(StationStatus.Inactive));

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.ActivateAsync(TestStations.StationId));
        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.DeactivateAsync("6aaa95c6e007313fe4c19998"));
    }

    // Prosumers only get active stations, whatever filter they send.
    [Fact]
    public async Task ListAsync_Prosumer_AlwaysGetsActiveStations()
    {
        _stations.ListAsync(StationStatus.Active, null).Returns(new List<SolarStation> { TestStations.Station() });

        var result = await _service.ListAsync(StationStatus.Inactive, null, _prosumer);

        Assert.Single(result);
        await _stations.Received(1).ListAsync(StationStatus.Active, null);
    }

    // Staff can filter by any status.
    [Fact]
    public async Task ListAsync_Staff_UsesRequestedFilter()
    {
        _stations.ListAsync(default, default).ReturnsForAnyArgs(new List<SolarStation>());

        await _service.ListAsync(StationStatus.Inactive, "galle", _admin);

        await _stations.Received(1).ListAsync(StationStatus.Inactive, "galle");
    }

    // Inactive stations look like missing ones to prosumers.
    [Fact]
    public async Task GetAsync_InactiveStationForProsumer_ThrowsNotFound()
    {
        _stations.GetByIdAsync(TestStations.StationId).Returns(TestStations.Station(StationStatus.Inactive));

        await Assert.ThrowsAsync<NotFoundException>(() => _service.GetAsync(TestStations.StationId, _prosumer));
        Assert.Equal(StationStatus.Inactive, (await _service.GetAsync(TestStations.StationId, _admin)).Status);
    }

    // The map search needs a valid position.
    [Theory]
    [InlineData(null, 79.9)]
    [InlineData(6.9, null)]
    [InlineData(95.0, 79.9)]
    [InlineData(6.9, 190.0)]
    public async Task FindNearbyAsync_InvalidPosition_Throws(double? lat, double? lng)
    {
        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.FindNearbyAsync(lat, lng, null));
    }

    // The radius must be sensible.
    [Theory]
    [InlineData(0.0)]
    [InlineData(-5.0)]
    [InlineData(501.0)]
    public async Task FindNearbyAsync_InvalidRadius_Throws(double radius)
    {
        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.FindNearbyAsync(6.9, 79.9, radius));
    }

    // Without a radius the search covers 10 km and returns the distance.
    [Fact]
    public async Task FindNearbyAsync_DefaultRadius_ReturnsDistances()
    {
        _stations.FindNearbyAsync(6.9, 79.9, StationService.DefaultRadiusKm, 20)
            .Returns(new List<(SolarStation, double)> { (TestStations.Station(), 2.35) });

        var result = await _service.FindNearbyAsync(6.9, 79.9, null);

        Assert.Equal(2.35, Assert.Single(result).DistanceKm);
    }

    // A valid request for a new station.
    private static StationRequest NewRequest()
    {
        return new StationRequest
        {
            Code = " ssg-gal-02 ",
            Name = "Galle Harbour Microgrid",
            Address = "Harbour Road, Galle",
            Latitude = 6.0269,
            Longitude = 80.217,
            SolarCapacityKw = 120,
            StorageCapacityKwh = 400,
            TotalBatterySlots = 10
        };
    }

    // One schedule entry.
    private static OperatingHoursDto Hours(DayOfWeek day, string open, string close)
    {
        return new OperatingHoursDto { Day = day, OpenTime = open, CloseTime = close };
    }
}
