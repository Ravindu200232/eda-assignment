/*
 * File:    CheckInFlowTests.cs
 * Module:  E2E Tests
 * Owner:   Ravindu
 * Purpose: The full journey from mobile sign-up to a completed energy transfer,
 *          and the QR checks an operator relies on at the station.
 */
using System.Net;
using SolarGrid.Api.Common;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.E2ETests.Infrastructure;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.E2ETests;

[Collection(ApiCollection.Name)]
public class CheckInFlowTests
{
    private readonly ApiFactory _factory;

    // Receives the shared running API.
    public CheckInFlowTests(ApiFactory factory)
    {
        _factory = factory;
    }

    // Sign-up -> activation -> station and slot -> map -> booking -> approval -> QR -> check-in -> history.
    [Fact]
    public async Task FullJourney_FromSignUpToCompletedTransfer()
    {
        var anonymous = _factory.CreateClient();
        var admin = await _factory.AdminClientAsync();

        // 1. A prosumer signs up in the mobile app and Backoffice activates the account.
        var prosumer = await (await anonymous.PostJsonAsync("/api/prosumers/register", ProsumerTestData.NewRegistration()))
            .ReadAsync<UserResponse>(HttpStatusCode.Created);
        await (await admin.PostAsync($"/api/prosumers/{prosumer.Nic}/activate", null)).ShouldHaveStatusAsync(HttpStatusCode.OK);
        var prosumerClient = await _factory.ClientForAsync(prosumer.Email, ProsumerTestData.Password);

        // 2. Backoffice registers a station and a Grid Operator opens a slot that starts soon.
        var lat = 9.0 + Random.Shared.NextDouble() / 2;
        var lng = 80.0 + Random.Shared.NextDouble() / 4;
        var station = await StationTestData.CreateAsync(admin, StationTestData.NewStation(lat, lng));
        var operatorUser = await TestData.CreateStaffAsync(admin, UserRole.GridOperator);
        var operatorClient = await _factory.ClientForAsync(operatorUser.Email, TestData.StaffPassword);
        var slot = await ReservationTestData.CreateSoonSlotAsync(operatorClient, station.Id);

        // 3. The prosumer finds the station on the map and books the slot.
        var nearbyUrl = FormattableString.Invariant($"/api/stations/nearby?lat={lat}&lng={lng}&radiusKm=1");
        var nearby = await (await prosumerClient.GetAsync(nearbyUrl)).ReadAsync<List<NearbyStationResponse>>();
        Assert.Contains(nearby, s => s.Id == station.Id);
        var booking = await ReservationTestData.BookAsync(prosumerClient, slot.Id, energyKwh: 8);

        // 4. The operator approves the booking and the prosumer opens the QR code.
        await (await operatorClient.PostAsync($"/api/reservations/{booking.Id}/approve", null))
            .ShouldHaveStatusAsync(HttpStatusCode.OK);
        var qr = await (await prosumerClient.GetAsync($"/api/reservations/{booking.Id}/qr")).ReadAsync<QrCodeResponse>();

        // 5. At the station the operator scans the code and finishes the transfer.
        var check = await (await operatorClient.PostJsonAsync("/api/checkin/verify", new { payload = qr.Payload }))
            .ReadAsync<CheckInResponse>();
        Assert.True(check.CanComplete);
        Assert.Equal(prosumer.Phone, check.ProsumerPhone);
        Assert.Equal(booking.Id, check.Reservation.Id);

        var completed = await (await operatorClient.PostJsonAsync($"/api/checkin/{booking.Id}/complete",
            new { payload = qr.Payload, deliveredKwh = 7.25 })).ReadAsync<ReservationResponse>();
        Assert.Equal(ReservationStatus.Completed, completed.Status);
        Assert.Equal(7.25, completed.DeliveredKwh);
        Assert.Equal(operatorUser.Nic, completed.CompletedBy);

        // 6. The booking shows in the prosumer's history and dashboard; its bay stays used.
        var history = await (await prosumerClient.GetAsync("/api/reservations?scope=history"))
            .ReadAsync<PagedResult<ReservationResponse>>();
        Assert.Contains(history.Items, r => r.Id == booking.Id && r.Status == ReservationStatus.Completed);

        var dashboard = await (await prosumerClient.GetAsync("/api/dashboard/my-summary")).ReadAsync<ProsumerDashboardResponse>();
        Assert.Equal(1, dashboard.CompletedCount);
        Assert.Equal(7.25, dashboard.TotalDeliveredKwh);
        Assert.Equal(1, (await ReservationTestData.GetSlotAsync(admin, slot.Id)).BookedCount);

        // 7. The same code cannot be used a second time.
        var again = await (await operatorClient.PostJsonAsync("/api/checkin/verify", new { payload = qr.Payload }))
            .ReadAsync<CheckInResponse>();
        Assert.False(again.CanComplete);
        Assert.Equal("This booking has already been completed.", again.Message);

        var secondComplete = await operatorClient.PostJsonAsync($"/api/checkin/{booking.Id}/complete",
            new { payload = qr.Payload, deliveredKwh = 7.25 });
        await secondComplete.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);
    }

    // A code with an edited signature is refused.
    [Fact]
    public async Task ForgedCode_IsRefused()
    {
        var approved = await ApprovedSoonBookingAsync();
        var payload = approved.Payload;
        var forged = payload[..^2] + (payload.EndsWith("AA") ? "BB" : "AA");

        var response = await approved.Operator.PostJsonAsync("/api/checkin/verify", new { payload = forged });

        var problem = await response.ReadProblemAsync(HttpStatusCode.BadRequest);
        Assert.Equal("This QR code is not genuine.", problem.Detail);
    }

    // Text that is not a booking code gets a clear message.
    [Fact]
    public async Task RandomText_IsRefused()
    {
        var admin = await _factory.AdminClientAsync();

        var response = await admin.PostJsonAsync("/api/checkin/verify", new { payload = "hello world" });

        var problem = await response.ReadProblemAsync(HttpStatusCode.BadRequest);
        Assert.Equal("This is not a Smart Solar booking QR code.", problem.Detail);
    }

    // After a change and a new approval only the newest code works; it also opens only near the start.
    [Fact]
    public async Task OldCode_AfterChangeAndReapproval_IsRefused()
    {
        var setup = await ReservationTestData.CreateSetupAsync(_factory);
        var booking = await ReservationTestData.BookAsync(setup.ProsumerClient, setup.Slot.Id);
        await (await setup.Admin.PostAsync($"/api/reservations/{booking.Id}/approve", null)).ShouldHaveStatusAsync(HttpStatusCode.OK);
        var oldQr = await (await setup.ProsumerClient.GetAsync($"/api/reservations/{booking.Id}/qr")).ReadAsync<QrCodeResponse>();

        await (await setup.ProsumerClient.PutJsonAsync($"/api/reservations/{booking.Id}",
            new { slotId = setup.Slot.Id, energyKwh = 15, tradeType = "Export" })).ShouldHaveStatusAsync(HttpStatusCode.OK);
        await (await setup.Admin.PostAsync($"/api/reservations/{booking.Id}/approve", null)).ShouldHaveStatusAsync(HttpStatusCode.OK);
        var newQr = await (await setup.ProsumerClient.GetAsync($"/api/reservations/{booking.Id}/qr")).ReadAsync<QrCodeResponse>();

        var oldResponse = await setup.Admin.PostJsonAsync("/api/checkin/verify", new { payload = oldQr.Payload });
        var oldProblem = await oldResponse.ReadProblemAsync(HttpStatusCode.BadRequest);
        Assert.Contains("out of date", oldProblem.Detail);

        var newCheck = await (await setup.Admin.PostJsonAsync("/api/checkin/verify", new { payload = newQr.Payload }))
            .ReadAsync<CheckInResponse>();
        Assert.False(newCheck.CanComplete);
        Assert.StartsWith("Check-in for this booking opens at", newCheck.Message);
    }

    // A code can only complete its own booking.
    [Fact]
    public async Task Complete_WithAnotherBookingsCode_IsRefused()
    {
        var first = await ApprovedSoonBookingAsync();
        var second = await ApprovedSoonBookingAsync();

        var response = await first.Operator.PostJsonAsync($"/api/checkin/{first.BookingId}/complete",
            new { payload = second.Payload, deliveredKwh = 5 });

        var problem = await response.ReadProblemAsync(HttpStatusCode.BadRequest);
        Assert.Equal("This QR code belongs to a different booking.", problem.Detail);
    }

    // Prosumers cannot use the operator endpoints.
    [Fact]
    public async Task Prosumer_CannotCheckIn()
    {
        var (_, prosumerClient) = await ProsumerTestData.CreateActiveAsync(_factory);

        var response = await prosumerClient.PostJsonAsync("/api/checkin/verify", new { payload = "SSG1.a.b.c" });

        await response.ShouldHaveStatusAsync(HttpStatusCode.Forbidden);
    }

    // An approved booking in a slot that starts within two hours, ready to be scanned.
    private async Task<(string BookingId, string Payload, HttpClient Operator)> ApprovedSoonBookingAsync()
    {
        var setup = await ReservationTestData.CreateSetupAsync(_factory);
        var soonSlot = await ReservationTestData.CreateSoonSlotAsync(setup.Admin, setup.Station.Id);
        var booking = await ReservationTestData.BookAsync(setup.ProsumerClient, soonSlot.Id);

        await (await setup.Admin.PostAsync($"/api/reservations/{booking.Id}/approve", null)).ShouldHaveStatusAsync(HttpStatusCode.OK);
        var qr = await (await setup.ProsumerClient.GetAsync($"/api/reservations/{booking.Id}/qr")).ReadAsync<QrCodeResponse>();

        return (booking.Id, qr.Payload, setup.Admin);
    }
}
