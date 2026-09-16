/*
 * File:    ReservationFlowTests.cs
 * Module:  E2E Tests
 * Owner:   Hamnad
 * Purpose: The booking workflow and its rules over real HTTP calls and a real database.
 */
using System.Net;
using SolarGrid.Api.Common;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.E2ETests.Infrastructure;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.E2ETests;

[Collection(ApiCollection.Name)]
public class ReservationFlowTests
{
    private readonly ApiFactory _factory;

    // Receives the shared running API.
    public ReservationFlowTests(ApiFactory factory)
    {
        _factory = factory;
    }

    // Book -> change -> cancel, with the slot's bay count following along.
    [Fact]
    public async Task Prosumer_BooksChangesAndCancels()
    {
        var setup = await ReservationTestData.CreateSetupAsync(_factory);

        var booking = await ReservationTestData.BookAsync(setup.ProsumerClient, setup.Slot.Id);
        Assert.Equal(ReservationStatus.Pending, booking.Status);
        Assert.True(booking.CanModify);
        Assert.Equal(1, (await ReservationTestData.GetSlotAsync(setup.Admin, setup.Slot.Id)).BookedCount);

        var changed = await (await setup.ProsumerClient.PutJsonAsync($"/api/reservations/{booking.Id}",
            new { slotId = setup.Slot.Id, energyKwh = 25.5, tradeType = "Import" })).ReadAsync<ReservationResponse>();
        Assert.Equal(25.5, changed.EnergyKwh);
        Assert.Equal(TradeType.Import, changed.TradeType);

        var cancelled = await (await setup.ProsumerClient.PostJsonAsync($"/api/reservations/{booking.Id}/cancel",
            new { reason = "Going on holiday" })).ReadAsync<ReservationResponse>();
        Assert.Equal(ReservationStatus.Cancelled, cancelled.Status);
        Assert.Equal("Going on holiday", cancelled.Reason);
        Assert.Equal(0, (await ReservationTestData.GetSlotAsync(setup.Admin, setup.Slot.Id)).BookedCount);
    }

    // Approval issues a QR code; a later change needs approval again and removes the code.
    [Fact]
    public async Task Approval_IssuesQrCode_UntilTheBookingChanges()
    {
        var setup = await ReservationTestData.CreateSetupAsync(_factory);
        var booking = await ReservationTestData.BookAsync(setup.ProsumerClient, setup.Slot.Id);
        var operatorUser = await TestData.CreateStaffAsync(setup.Admin, UserRole.GridOperator);
        var operatorClient = await _factory.ClientForAsync(operatorUser.Email, TestData.StaffPassword);

        var approved = await (await operatorClient.PostAsync($"/api/reservations/{booking.Id}/approve", null))
            .ReadAsync<ReservationResponse>();
        Assert.Equal(ReservationStatus.Approved, approved.Status);
        Assert.Equal(operatorUser.Nic, approved.ApprovedBy);

        var qr = await (await setup.ProsumerClient.GetAsync($"/api/reservations/{booking.Id}/qr")).ReadAsync<QrCodeResponse>();
        Assert.StartsWith($"SSG1.{booking.Id}.", qr.Payload);

        var current = await (await setup.ProsumerClient.GetAsync("/api/reservations?scope=current"))
            .ReadAsync<PagedResult<ReservationResponse>>();
        Assert.Contains(current.Items, r => r.Id == booking.Id);

        var changed = await (await setup.ProsumerClient.PutJsonAsync($"/api/reservations/{booking.Id}",
            new { slotId = setup.Slot.Id, energyKwh = 12, tradeType = "Export" })).ReadAsync<ReservationResponse>();
        Assert.Equal(ReservationStatus.Pending, changed.Status);
        Assert.False(changed.HasQrCode);

        var qrAfterChange = await setup.ProsumerClient.GetAsync($"/api/reservations/{booking.Id}/qr");
        await qrAfterChange.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);
    }

    // Moving a booking frees the old slot's bay and takes one in the new slot.
    [Fact]
    public async Task MovingToAnotherSlot_SwapsTheBays()
    {
        var setup = await ReservationTestData.CreateSetupAsync(_factory);
        var otherSlot = await StationTestData.CreateSlotAsync(setup.Admin, setup.Station.Id,
            StationTestData.LocalToday().AddDays(3), "14:00", "16:00");
        var booking = await ReservationTestData.BookAsync(setup.ProsumerClient, setup.Slot.Id);

        var moved = await (await setup.ProsumerClient.PutJsonAsync($"/api/reservations/{booking.Id}",
            new { slotId = otherSlot.Id, energyKwh = 10, tradeType = "Export" })).ReadAsync<ReservationResponse>();

        Assert.Equal(otherSlot.StartTime, moved.StartTime);
        Assert.Equal(0, (await ReservationTestData.GetSlotAsync(setup.Admin, setup.Slot.Id)).BookedCount);
        Assert.Equal(1, (await ReservationTestData.GetSlotAsync(setup.Admin, otherSlot.Id)).BookedCount);
    }

    // Bookings more than 7 days ahead are refused.
    [Fact]
    public async Task Booking_MoreThanSevenDaysAhead_Returns400()
    {
        var setup = await ReservationTestData.CreateSetupAsync(_factory);
        var farSlot = await StationTestData.CreateSlotAsync(setup.Admin, setup.Station.Id, StationTestData.LocalToday().AddDays(8));

        var response = await setup.ProsumerClient.PostJsonAsync("/api/reservations",
            new { slotId = farSlot.Id, energyKwh = 10, tradeType = "Export" });

        var problem = await response.ReadProblemAsync(HttpStatusCode.BadRequest);
        Assert.Equal("Bookings can only be made up to 7 days in advance.", problem.Detail);
    }

    // Inside the last 12 hours a booking can no longer be changed or cancelled.
    [Fact]
    public async Task ChangesWithinTwelveHours_Return400()
    {
        var setup = await ReservationTestData.CreateSetupAsync(_factory);
        var soonSlot = await ReservationTestData.CreateSoonSlotAsync(setup.Admin, setup.Station.Id);
        var booking = await ReservationTestData.BookAsync(setup.ProsumerClient, soonSlot.Id);
        Assert.False(booking.CanModify);

        var update = await setup.ProsumerClient.PutJsonAsync($"/api/reservations/{booking.Id}",
            new { slotId = soonSlot.Id, energyKwh = 5, tradeType = "Import" });
        var cancel = await setup.ProsumerClient.PostAsync($"/api/reservations/{booking.Id}/cancel", null);

        var updateProblem = await update.ReadProblemAsync(HttpStatusCode.BadRequest);
        var cancelProblem = await cancel.ReadProblemAsync(HttpStatusCode.BadRequest);
        Assert.Contains("at least 12 hours", updateProblem.Detail);
        Assert.Equal("Bookings can only be cancelled at least 12 hours before the start time.", cancelProblem.Detail);
    }

    // When the last bay is taken, the next booking gets 409.
    [Fact]
    public async Task FullSlot_Returns409()
    {
        var setup = await ReservationTestData.CreateSetupAsync(_factory, slotCapacity: 1);
        var (_, secondClient) = await ProsumerTestData.CreateActiveAsync(_factory);
        await ReservationTestData.BookAsync(setup.ProsumerClient, setup.Slot.Id);

        var response = await secondClient.PostJsonAsync("/api/reservations",
            new { slotId = setup.Slot.Id, energyKwh = 10, tradeType = "Export" });

        var problem = await response.ReadProblemAsync(HttpStatusCode.Conflict);
        Assert.Contains("fully booked", problem.Detail);
    }

    // Many prosumers racing for the last bays never overbook the slot.
    [Fact]
    public async Task ParallelBookings_NeverOverbook()
    {
        var setup = await ReservationTestData.CreateSetupAsync(_factory, slotCapacity: 2);
        var clients = new List<HttpClient>();
        for (var i = 0; i < 6; i++)
            clients.Add((await ProsumerTestData.CreateActiveAsync(_factory)).Client);

        var responses = await Task.WhenAll(clients.Select(c => c.PostJsonAsync("/api/reservations",
            new { slotId = setup.Slot.Id, energyKwh = 5, tradeType = "Export" })));

        Assert.Equal(2, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
        Assert.Equal(4, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));
        Assert.Equal(2, (await ReservationTestData.GetSlotAsync(setup.Admin, setup.Slot.Id)).BookedCount);
    }

    // A prosumer cannot be at two stations at the same time.
    [Fact]
    public async Task OverlappingBookings_Return409()
    {
        var setup = await ReservationTestData.CreateSetupAsync(_factory);
        var otherStation = await StationTestData.CreateAsync(setup.Admin);
        var sameTimeSlot = await StationTestData.CreateSlotAsync(setup.Admin, otherStation.Id, StationTestData.LocalToday().AddDays(2));
        await ReservationTestData.BookAsync(setup.ProsumerClient, setup.Slot.Id);

        var response = await setup.ProsumerClient.PostJsonAsync("/api/reservations",
            new { slotId = sameTimeSlot.Id, energyKwh = 10, tradeType = "Export" });

        var problem = await response.ReadProblemAsync(HttpStatusCode.Conflict);
        Assert.Equal("You already have a booking at this time.", problem.Detail);
    }

    // Rejection needs a reason, frees the bay and moves the booking to history.
    [Fact]
    public async Task Rejection_FreesBayAndShowsInHistory()
    {
        var setup = await ReservationTestData.CreateSetupAsync(_factory);
        var booking = await ReservationTestData.BookAsync(setup.ProsumerClient, setup.Slot.Id);

        var noReason = await setup.Admin.PostJsonAsync($"/api/reservations/{booking.Id}/reject", new { });
        await noReason.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);

        var rejected = await (await setup.Admin.PostJsonAsync($"/api/reservations/{booking.Id}/reject",
            new { reason = "Battery maintenance" })).ReadAsync<ReservationResponse>();
        Assert.Equal(ReservationStatus.Rejected, rejected.Status);
        Assert.Equal(0, (await ReservationTestData.GetSlotAsync(setup.Admin, setup.Slot.Id)).BookedCount);

        var history = await (await setup.ProsumerClient.GetAsync("/api/reservations?scope=history"))
            .ReadAsync<PagedResult<ReservationResponse>>();
        var pending = await (await setup.ProsumerClient.GetAsync("/api/reservations?scope=pending"))
            .ReadAsync<PagedResult<ReservationResponse>>();
        Assert.Contains(history.Items, r => r.Id == booking.Id && r.Reason == "Battery maintenance");
        Assert.DoesNotContain(pending.Items, r => r.Id == booking.Id);
    }

    // Staff can search by reference number and filter by prosumer.
    [Fact]
    public async Task Staff_SearchAndFilterBookings()
    {
        var setup = await ReservationTestData.CreateSetupAsync(_factory);
        var booking = await ReservationTestData.BookAsync(setup.ProsumerClient, setup.Slot.Id);

        var byReference = await (await setup.Admin.GetAsync($"/api/reservations?search={booking.ReferenceNo}"))
            .ReadAsync<PagedResult<ReservationResponse>>();
        var byProsumer = await (await setup.Admin.GetAsync($"/api/reservations?nic={setup.Prosumer.Nic}&scope=pending"))
            .ReadAsync<PagedResult<ReservationResponse>>();
        var byStation = await (await setup.Admin.GetAsync($"/api/reservations?stationId={setup.Station.Id}"))
            .ReadAsync<PagedResult<ReservationResponse>>();

        Assert.Equal(booking.Id, Assert.Single(byReference.Items).Id);
        Assert.Equal(booking.Id, Assert.Single(byProsumer.Items).Id);
        Assert.Equal(booking.Id, Assert.Single(byStation.Items).Id);
    }

    // Staff book on behalf of a prosumer, and must say who it is for.
    [Fact]
    public async Task Staff_BooksForProsumer()
    {
        var setup = await ReservationTestData.CreateSetupAsync(_factory);

        var missing = await setup.Admin.PostJsonAsync("/api/reservations",
            new { slotId = setup.Slot.Id, energyKwh = 10, tradeType = "Export" });
        await missing.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);

        var booking = await ReservationTestData.BookAsync(setup.Admin, setup.Slot.Id, prosumerNic: setup.Prosumer.Nic);

        Assert.Equal(setup.Prosumer.Nic, booking.ProsumerNic);
        Assert.Equal(ApiFactory.AdminNic, booking.CreatedBy);
    }

    // Prosumers cannot see, change or approve other people's bookings.
    [Fact]
    public async Task Prosumer_CannotTouchOtherPeoplesBookings()
    {
        var setup = await ReservationTestData.CreateSetupAsync(_factory);
        var booking = await ReservationTestData.BookAsync(setup.ProsumerClient, setup.Slot.Id);
        var (_, otherClient) = await ProsumerTestData.CreateActiveAsync(_factory);

        await (await otherClient.GetAsync($"/api/reservations/{booking.Id}")).ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        await (await otherClient.PostAsync($"/api/reservations/{booking.Id}/cancel", null)).ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        await (await otherClient.PostAsync($"/api/reservations/{booking.Id}/approve", null)).ShouldHaveStatusAsync(HttpStatusCode.Forbidden);

        var otherList = await (await otherClient.GetAsync($"/api/reservations?nic={setup.Prosumer.Nic}"))
            .ReadAsync<PagedResult<ReservationResponse>>();
        Assert.Empty(otherList.Items);
    }

    // The prosumer dashboard follows real bookings and approvals.
    [Fact]
    public async Task Dashboard_TracksBookingAndApproval()
    {
        var setup = await ReservationTestData.CreateSetupAsync(_factory);
        var booking = await ReservationTestData.BookAsync(setup.ProsumerClient, setup.Slot.Id);

        var beforeApproval = await (await setup.ProsumerClient.GetAsync("/api/dashboard/my-summary"))
            .ReadAsync<ProsumerDashboardResponse>();
        await (await setup.Admin.PostAsync($"/api/reservations/{booking.Id}/approve", null)).ShouldHaveStatusAsync(HttpStatusCode.OK);
        var afterApproval = await (await setup.ProsumerClient.GetAsync("/api/dashboard/my-summary"))
            .ReadAsync<ProsumerDashboardResponse>();

        Assert.Equal(1, beforeApproval.PendingCount);
        Assert.Equal(0, afterApproval.PendingCount);
        Assert.Equal(1, afterApproval.ApprovedFutureCount);
        Assert.Equal(booking.ReferenceNo, afterApproval.NextReservation?.ReferenceNo);
    }
}
