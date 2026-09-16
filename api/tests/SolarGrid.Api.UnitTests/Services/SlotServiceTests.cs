/*
 * File:    SlotServiceTests.cs
 * Module:  Unit Tests
 * Owner:   Nimthara
 * Purpose: Rules for creating, generating, changing and listing energy slots.
 *          The test clock is Sunday 20 Sep 2026, 10:00 in Sri Lanka.
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

public class SlotServiceTests
{
    private static readonly DateOnly Today = new(2026, 9, 20);    // Sunday
    private static readonly DateOnly Monday = new(2026, 9, 21);
    private static readonly DateOnly Saturday = new(2026, 9, 26);

    private readonly ISlotRepository _slots = Substitute.For<ISlotRepository>();
    private readonly IStationRepository _stations = Substitute.For<IStationRepository>();
    private readonly AppClock _clock = TestClock.Create().Clock;
    private readonly SlotService _service;
    private readonly SolarStation _station = TestStations.Station();

    // Wires the service to fake repositories that know one active station.
    public SlotServiceTests()
    {
        _stations.GetByIdAsync(TestStations.StationId).Returns(_station);
        _slots.ListByStationAsync(default!, default, default).ReturnsForAnyArgs(new List<EnergySlot>());
        _service = new SlotService(_slots, _stations, _clock);
    }

    // Local 08:00-10:00 on Monday is saved as 02:30-04:30 UTC with all available bays.
    [Fact]
    public async Task CreateAsync_ValidSlot_StoresUtcTimes()
    {
        var result = await _service.CreateAsync(TestStations.StationId, SlotRequest(Monday, "08:00", "10:00"));

        Assert.Equal(new DateTime(2026, 9, 21, 2, 30, 0, DateTimeKind.Utc), result.StartTime);
        Assert.Equal(new DateTime(2026, 9, 21, 4, 30, 0, DateTimeKind.Utc), result.EndTime);
        Assert.Equal(4, result.Capacity);
        Assert.Equal(4, result.AvailableBays);
        await _slots.Received(1).InsertAsync(Arg.Is<EnergySlot>(s => s.StationId == TestStations.StationId && s.IsOpen));
    }

    // Times that already passed today are refused.
    [Fact]
    public async Task CreateAsync_StartInPast_Throws()
    {
        var error = await Assert.ThrowsAsync<BusinessRuleException>(() =>
            _service.CreateAsync(TestStations.StationId, SlotRequest(Today, "08:00", "10:00")));

        Assert.Equal("Slots must start in the future.", error.Message);
    }

    // Slots must fit the opening hours.
    [Fact]
    public async Task CreateAsync_OutsideOpeningHours_Throws()
    {
        var error = await Assert.ThrowsAsync<BusinessRuleException>(() =>
            _service.CreateAsync(TestStations.StationId, SlotRequest(Monday, "17:00", "19:00")));

        Assert.Contains("open from 06:00 to 18:00", error.Message);
    }

    // No slots on a closed day.
    [Fact]
    public async Task CreateAsync_ClosedDay_Throws()
    {
        var error = await Assert.ThrowsAsync<BusinessRuleException>(() =>
            _service.CreateAsync(TestStations.StationId, SlotRequest(Saturday, "08:00", "10:00")));

        Assert.Contains("closed on Saturdays", error.Message);
    }

    // Slots must run forwards and last 30 minutes to 12 hours.
    [Theory]
    [InlineData("08:00", "08:15")]
    [InlineData("10:00", "08:00")]
    [InlineData("06:00", "18:30")]
    public async Task CreateAsync_BadLength_Throws(string start, string end)
    {
        await Assert.ThrowsAsync<BusinessRuleException>(() =>
            _service.CreateAsync(TestStations.StationId, SlotRequest(Monday, start, end)));
    }

    // Overlapping another slot is a conflict.
    [Fact]
    public async Task CreateAsync_Overlap_ThrowsConflict()
    {
        _slots.HasOverlapAsync(TestStations.StationId, Arg.Any<DateTime>(), Arg.Any<DateTime>()).Returns(true);

        await Assert.ThrowsAsync<ConflictException>(() =>
            _service.CreateAsync(TestStations.StationId, SlotRequest(Monday, "08:00", "10:00")));
    }

    // Capacity is limited by the available battery slots.
    [Fact]
    public async Task CreateAsync_CapacityAboveAvailable_Throws()
    {
        var request = SlotRequest(Monday, "08:00", "10:00");
        request.Capacity = 5;

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => _service.CreateAsync(TestStations.StationId, request));

        Assert.Contains("4 available battery slots", error.Message);
    }

    // With every bay out of service no slot can be offered.
    [Fact]
    public async Task CreateAsync_NoAvailableBatterySlots_Throws()
    {
        _station.AvailableBatterySlots = 0;

        await Assert.ThrowsAsync<BusinessRuleException>(() =>
            _service.CreateAsync(TestStations.StationId, SlotRequest(Monday, "08:00", "10:00")));
    }

    // Inactive stations take no new slots.
    [Fact]
    public async Task CreateAsync_InactiveStation_Throws()
    {
        _station.Status = StationStatus.Inactive;

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() =>
            _service.CreateAsync(TestStations.StationId, SlotRequest(Monday, "08:00", "10:00")));

        Assert.Contains("active stations", error.Message);
    }

    // Slots can be prepared at most 30 days ahead.
    [Fact]
    public async Task CreateAsync_TooFarAhead_Throws()
    {
        await Assert.ThrowsAsync<BusinessRuleException>(() =>
            _service.CreateAsync(TestStations.StationId, SlotRequest(Today.AddDays(31), "08:00", "10:00")));
    }

    // A week of 2-hour slots: past and taken times are skipped, Saturday is closed.
    [Fact]
    public async Task GenerateAsync_Week_SkipsPastTakenAndClosedTimes()
    {
        var takenMonday = TestStations.Slot(_clock.ToUtc(Monday, 8 * 60), booked: 1);
        _slots.ListByStationAsync(default!, default, default).ReturnsForAnyArgs(new List<EnergySlot> { takenMonday });

        var result = await _service.GenerateAsync(TestStations.StationId, new GenerateSlotsRequest { Days = 7, SlotMinutes = 120 });

        // Today: 06, 08 and 10 o'clock have started -> 3 skipped, 3 created.
        // Monday: 08 o'clock is taken -> 1 skipped, 5 created. Tue-Fri: 4 x 6. Saturday closed.
        Assert.Equal(4, result.Skipped);
        Assert.Equal(32, result.Created);
        Assert.Equal(_clock.ToUtc(Today, 12 * 60), result.Slots[0].StartTime);
        await _slots.Received(1).InsertManyAsync(Arg.Is<IEnumerable<EnergySlot>>(s => s.Count() == 32));
    }

    // Past dates cannot be filled.
    [Fact]
    public async Task GenerateAsync_PastFromDate_Throws()
    {
        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.GenerateAsync(TestStations.StationId,
            new GenerateSlotsRequest { FromDate = Today.AddDays(-1) }));
    }

    // Capacity cannot drop below the bays already booked.
    [Fact]
    public async Task UpdateAsync_CapacityBelowBooked_Throws()
    {
        _slots.GetByIdAsync(TestStations.SlotId).Returns(TestStations.Slot(_clock.UtcNow.AddDays(1), capacity: 4, booked: 3));

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => _service.UpdateAsync(TestStations.SlotId,
            new UpdateSlotRequest { Capacity = 2, IsOpen = true }));

        Assert.Contains("3 bays already booked", error.Message);
    }

    // Capacity cannot exceed the physical battery slots.
    [Fact]
    public async Task UpdateAsync_CapacityAboveTotal_Throws()
    {
        _slots.GetByIdAsync(TestStations.SlotId).Returns(TestStations.Slot(_clock.UtcNow.AddDays(1)));

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.UpdateAsync(TestStations.SlotId,
            new UpdateSlotRequest { Capacity = 9, IsOpen = true }));
    }

    // A booked slot cannot be closed.
    [Fact]
    public async Task UpdateAsync_CloseWithBookings_Throws()
    {
        _slots.GetByIdAsync(TestStations.SlotId).Returns(TestStations.Slot(_clock.UtcNow.AddDays(1), booked: 1));

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => _service.UpdateAsync(TestStations.SlotId,
            new UpdateSlotRequest { Capacity = 4, IsOpen = false }));

        Assert.Contains("has bookings", error.Message);
    }

    // Finished slots are history and stay as they are.
    [Fact]
    public async Task UpdateAsync_PastSlot_Throws()
    {
        _slots.GetByIdAsync(TestStations.SlotId).Returns(TestStations.Slot(_clock.UtcNow.AddHours(-5)));

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.UpdateAsync(TestStations.SlotId,
            new UpdateSlotRequest { Capacity = 4, IsOpen = true }));
    }

    // An empty slot can be resized and closed.
    [Fact]
    public async Task UpdateAsync_Valid_SavesChanges()
    {
        var slot = TestStations.Slot(_clock.UtcNow.AddDays(1));
        _slots.GetByIdAsync(TestStations.SlotId).Returns(slot);

        var result = await _service.UpdateAsync(TestStations.SlotId, new UpdateSlotRequest { Capacity = 8, IsOpen = false });

        Assert.Equal(8, result.Capacity);
        Assert.False(result.IsOpen);
        await _slots.Received(1).UpdateAsync(slot);
    }

    // Booked slots cannot be deleted.
    [Fact]
    public async Task DeleteAsync_WithBookings_Throws()
    {
        _slots.GetByIdAsync(TestStations.SlotId).Returns(TestStations.Slot(_clock.UtcNow.AddDays(1), booked: 2));

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.DeleteAsync(TestStations.SlotId));
        await _slots.DidNotReceiveWithAnyArgs().DeleteAsync(default!);
    }

    // Empty slots are removed.
    [Fact]
    public async Task DeleteAsync_NoBookings_Deletes()
    {
        _slots.GetByIdAsync(TestStations.SlotId).Returns(TestStations.Slot(_clock.UtcNow.AddDays(1)));

        await _service.DeleteAsync(TestStations.SlotId);

        await _slots.Received(1).DeleteAsync(TestStations.SlotId);
    }

    // Prosumers see only open future slots that still have a free bay.
    [Fact]
    public async Task ListForStationAsync_Prosumer_SeesOnlyBookableSlots()
    {
        var bookable = TestStations.Slot(_clock.UtcNow.AddHours(3));
        var full = TestStations.Slot(_clock.UtcNow.AddHours(5), capacity: 2, booked: 2);
        var closed = TestStations.Slot(_clock.UtcNow.AddHours(7), isOpen: false);
        var started = TestStations.Slot(_clock.UtcNow.AddHours(-1));
        _slots.ListByStationAsync(default!, default, default).ReturnsForAnyArgs(new List<EnergySlot> { bookable, full, closed, started });

        var prosumerView = await _service.ListForStationAsync(TestStations.StationId, null, null, false,
            new CurrentUser("200034501234", UserRole.Prosumer));
        var staffView = await _service.ListForStationAsync(TestStations.StationId, null, null, false,
            new CurrentUser("199023456789", UserRole.GridOperator));

        Assert.Equal(bookable.StartTime, Assert.Single(prosumerView).StartTime);
        Assert.Equal(4, staffView.Count);
    }

    // By default the list covers today and the next six days in local time.
    [Fact]
    public async Task ListForStationAsync_DefaultRange_IsSevenLocalDays()
    {
        await _service.ListForStationAsync(TestStations.StationId, null, null, false,
            new CurrentUser("198512345678", UserRole.Backoffice));

        await _slots.Received(1).ListByStationAsync(TestStations.StationId,
            new DateTime(2026, 9, 19, 18, 30, 0, DateTimeKind.Utc),
            new DateTime(2026, 9, 26, 18, 30, 0, DateTimeKind.Utc));
    }

    // Very long ranges are refused.
    [Fact]
    public async Task ListForStationAsync_RangeTooLong_Throws()
    {
        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.ListForStationAsync(TestStations.StationId,
            Today, Today.AddDays(31), false, new CurrentUser("198512345678", UserRole.Backoffice)));
    }

    // A slot request for a local date and times.
    private static CreateSlotRequest SlotRequest(DateOnly date, string start, string end)
    {
        return new CreateSlotRequest { Date = date, StartTime = start, EndTime = end };
    }
}
