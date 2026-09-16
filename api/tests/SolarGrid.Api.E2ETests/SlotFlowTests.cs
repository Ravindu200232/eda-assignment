/*
 * File:    SlotFlowTests.cs
 * Module:  E2E Tests
 * Owner:   Nimthara
 * Purpose: Creating, generating, changing and deleting energy slots over real HTTP calls.
 */
using System.Net;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.E2ETests.Infrastructure;

namespace SolarGrid.Api.E2ETests;

[Collection(ApiCollection.Name)]
public class SlotFlowTests
{
    private readonly ApiFactory _factory;

    // Receives the shared running API.
    public SlotFlowTests(ApiFactory factory)
    {
        _factory = factory;
    }

    // A slot made by staff is visible to prosumers for booking.
    [Fact]
    public async Task StaffSlot_IsVisibleToProsumers()
    {
        var admin = await _factory.AdminClientAsync();
        var (_, prosumerClient) = await ProsumerTestData.CreateActiveAsync(_factory);
        var station = await StationTestData.CreateAsync(admin);
        var tomorrow = StationTestData.LocalToday().AddDays(1);

        var slot = await StationTestData.CreateSlotAsync(admin, station.Id, tomorrow, capacity: 3);
        Assert.Equal(3, slot.AvailableBays);
        Assert.Equal(TimeSpan.FromHours(2), slot.EndTime - slot.StartTime);

        var date = tomorrow.ToString("yyyy-MM-dd");
        var visible = await (await prosumerClient.GetAsync($"/api/stations/{station.Id}/slots?from={date}&to={date}"))
            .ReadAsync<List<SlotResponse>>();

        Assert.Equal(slot.Id, Assert.Single(visible).Id);
    }

    // Two slots cannot share the same time at a station.
    [Fact]
    public async Task CreateSlot_Overlapping_Returns409()
    {
        var admin = await _factory.AdminClientAsync();
        var station = await StationTestData.CreateAsync(admin);
        var tomorrow = StationTestData.LocalToday().AddDays(1);
        await StationTestData.CreateSlotAsync(admin, station.Id, tomorrow, "10:00", "12:00");

        var response = await admin.PostJsonAsync($"/api/stations/{station.Id}/slots",
            new { date = tomorrow.ToString("yyyy-MM-dd"), startTime = "11:00", endTime = "13:00" });

        var problem = await response.ReadProblemAsync(HttpStatusCode.Conflict);
        Assert.Equal("This time overlaps another slot at the station.", problem.Detail);
    }

    // Slots outside the opening hours are refused.
    [Fact]
    public async Task CreateSlot_OutsideSchedule_Returns400()
    {
        var admin = await _factory.AdminClientAsync();
        var station = await StationTestData.CreateAsync(admin, StationTestData.NewStation(open: "08:00", close: "12:00"));
        var tomorrow = StationTestData.LocalToday().AddDays(1);

        var response = await admin.PostJsonAsync($"/api/stations/{station.Id}/slots",
            new { date = tomorrow.ToString("yyyy-MM-dd"), startTime = "13:00", endTime = "15:00" });

        var problem = await response.ReadProblemAsync(HttpStatusCode.BadRequest);
        Assert.Contains("open from 08:00 to 12:00", problem.Detail);
    }

    // Generating twice does not create duplicates.
    [Fact]
    public async Task GenerateSlots_IsSafeToRepeat()
    {
        var admin = await _factory.AdminClientAsync();
        var station = await StationTestData.CreateAsync(admin, StationTestData.NewStation(open: "08:00", close: "12:00"));
        var request = new { fromDate = StationTestData.LocalToday().AddDays(1).ToString("yyyy-MM-dd"), days = 2, slotMinutes = 120 };

        var first = await (await admin.PostJsonAsync($"/api/stations/{station.Id}/slots/generate", request))
            .ReadAsync<GenerateSlotsResponse>();
        var second = await (await admin.PostJsonAsync($"/api/stations/{station.Id}/slots/generate", request))
            .ReadAsync<GenerateSlotsResponse>();

        Assert.Equal(4, first.Created);
        Assert.Equal(0, second.Created);
        Assert.Equal(4, second.Skipped);
    }

    // Empty slots can be resized, closed and deleted.
    [Fact]
    public async Task Slot_UpdateAndDelete()
    {
        var admin = await _factory.AdminClientAsync();
        var station = await StationTestData.CreateAsync(admin);
        var slot = await StationTestData.CreateSlotAsync(admin, station.Id, StationTestData.LocalToday().AddDays(2));

        var updated = await (await admin.PutJsonAsync($"/api/slots/{slot.Id}", new { capacity = 5, isOpen = false }))
            .ReadAsync<SlotResponse>();
        Assert.Equal(5, updated.Capacity);
        Assert.False(updated.IsOpen);

        await (await admin.DeleteAsync($"/api/slots/{slot.Id}")).ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        await (await admin.GetAsync($"/api/slots/{slot.Id}")).ShouldHaveStatusAsync(HttpStatusCode.NotFound);
    }

    // Booked slots are protected from closing, shrinking and deleting.
    [Fact]
    public async Task BookedSlot_CannotBeClosedShrunkOrDeleted()
    {
        var admin = await _factory.AdminClientAsync();
        var station = await StationTestData.CreateAsync(admin);
        var slot = await StationTestData.CreateSlotAsync(admin, station.Id, StationTestData.LocalToday().AddDays(2), capacity: 4);
        await TestDb.SetSlotBookedCountAsync(_factory, slot.Id, 2);

        var close = await admin.PutJsonAsync($"/api/slots/{slot.Id}", new { capacity = 4, isOpen = false });
        var shrink = await admin.PutJsonAsync($"/api/slots/{slot.Id}", new { capacity = 1, isOpen = true });
        var delete = await admin.DeleteAsync($"/api/slots/{slot.Id}");

        await close.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);
        await shrink.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);
        var problem = await delete.ReadProblemAsync(HttpStatusCode.BadRequest);
        Assert.Equal("This slot has bookings and cannot be deleted.", problem.Detail);
    }

    // Prosumers cannot create slots.
    [Fact]
    public async Task Prosumer_CannotCreateSlot()
    {
        var admin = await _factory.AdminClientAsync();
        var (_, prosumerClient) = await ProsumerTestData.CreateActiveAsync(_factory);
        var station = await StationTestData.CreateAsync(admin);

        var response = await prosumerClient.PostJsonAsync($"/api/stations/{station.Id}/slots",
            new { date = StationTestData.LocalToday().AddDays(1).ToString("yyyy-MM-dd"), startTime = "10:00", endTime = "12:00" });

        await response.ShouldHaveStatusAsync(HttpStatusCode.Forbidden);
    }

    // Slots of an inactive station cannot be added.
    [Fact]
    public async Task InactiveStation_RejectsNewSlots()
    {
        var admin = await _factory.AdminClientAsync();
        var station = await StationTestData.CreateAsync(admin);
        await (await admin.PostAsync($"/api/stations/{station.Id}/deactivate", null)).ShouldHaveStatusAsync(HttpStatusCode.OK);

        var response = await admin.PostJsonAsync($"/api/stations/{station.Id}/slots",
            new { date = StationTestData.LocalToday().AddDays(1).ToString("yyyy-MM-dd"), startTime = "10:00", endTime = "12:00" });

        var problem = await response.ReadProblemAsync(HttpStatusCode.BadRequest);
        Assert.Equal("Slots can only be added to active stations.", problem.Detail);
    }
}
