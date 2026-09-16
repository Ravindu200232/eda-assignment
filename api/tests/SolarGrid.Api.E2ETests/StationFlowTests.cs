/*
 * File:    StationFlowTests.cs
 * Module:  E2E Tests
 * Owner:   Nimthara
 * Purpose: Station management, the nearby search, the deactivation rule and deletion over real HTTP calls.
 */
using System.Net;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.E2ETests.Infrastructure;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.E2ETests;

[Collection(ApiCollection.Name)]
public class StationFlowTests
{
    private readonly ApiFactory _factory;

    // Receives the shared running API.
    public StationFlowTests(ApiFactory factory)
    {
        _factory = factory;
    }

    // Backoffice creates, edits and reschedules a station; an operator updates its battery slots.
    [Fact]
    public async Task Station_ManagementFlow()
    {
        var admin = await _factory.AdminClientAsync();
        var station = await StationTestData.CreateAsync(admin);
        Assert.Equal(6, station.AvailableBatterySlots);
        Assert.Equal(50, station.BayCapacityKwh);

        var body = StationTestData.NewStation(6.95, 79.95);
        body["code"] = station.Code;
        body["name"] = "Renamed Microgrid";
        var updated = await (await admin.PutJsonAsync($"/api/stations/{station.Id}", body)).ReadAsync<StationResponse>();
        Assert.Equal("Renamed Microgrid", updated.Name);
        Assert.Equal(6.95, updated.Latitude);

        var scheduled = await (await admin.PutJsonAsync($"/api/stations/{station.Id}/schedule", new
        {
            schedule = new[]
            {
                new { day = "Monday", openTime = "07:00", closeTime = "19:00" },
                new { day = "Tuesday", openTime = "07:00", closeTime = "19:00" }
            }
        })).ReadAsync<StationResponse>();
        Assert.Equal(2, scheduled.Schedule.Count);

        var operatorUser = await TestData.CreateStaffAsync(admin, UserRole.GridOperator);
        var operatorClient = await _factory.ClientForAsync(operatorUser.Email, TestData.StaffPassword);
        var slotsUpdated = await (await operatorClient.PatchJsonAsync($"/api/stations/{station.Id}/battery-slots",
            new { availableBatterySlots = 2 })).ReadAsync<StationResponse>();
        Assert.Equal(2, slotsUpdated.AvailableBatterySlots);

        var search = await (await admin.GetAsync($"/api/stations?search={station.Code}")).ReadAsync<List<StationResponse>>();
        Assert.Equal(station.Id, Assert.Single(search).Id);
    }

    // Station codes are unique.
    [Fact]
    public async Task CreateStation_DuplicateCode_Returns409()
    {
        var admin = await _factory.AdminClientAsync();
        var existing = await StationTestData.CreateAsync(admin);
        var body = StationTestData.NewStation();
        body["code"] = existing.Code.ToLowerInvariant();

        var response = await admin.PostJsonAsync("/api/stations", body);

        await response.ShouldHaveStatusAsync(HttpStatusCode.Conflict);
    }

    // GPS values outside the valid range are rejected.
    [Fact]
    public async Task CreateStation_InvalidLatitude_Returns400()
    {
        var admin = await _factory.AdminClientAsync();

        var response = await admin.PostJsonAsync("/api/stations", StationTestData.NewStation(latitude: 120));

        var problem = await response.ReadProblemAsync(HttpStatusCode.BadRequest);
        Assert.Equal("Latitude must be between -90 and 90.", problem.Detail);
    }

    // Only Backoffice registers stations.
    [Fact]
    public async Task GridOperator_CannotCreateStation()
    {
        var admin = await _factory.AdminClientAsync();
        var operatorUser = await TestData.CreateStaffAsync(admin, UserRole.GridOperator);
        var operatorClient = await _factory.ClientForAsync(operatorUser.Email, TestData.StaffPassword);

        var response = await operatorClient.PostJsonAsync("/api/stations", StationTestData.NewStation());

        await response.ShouldHaveStatusAsync(HttpStatusCode.Forbidden);
    }

    // The map search returns close active stations with their distance.
    [Fact]
    public async Task NearbySearch_ReturnsCloseActiveStationsOnly()
    {
        var admin = await _factory.AdminClientAsync();
        var (_, prosumerClient) = await ProsumerTestData.CreateActiveAsync(_factory);
        var lat = 8.0 + Random.Shared.NextDouble() / 2;
        var lng = 81.0 + Random.Shared.NextDouble() / 4;

        var near = await StationTestData.CreateAsync(admin, StationTestData.NewStation(lat, lng));
        var inactive = await StationTestData.CreateAsync(admin, StationTestData.NewStation(lat + 0.001, lng));
        var far = await StationTestData.CreateAsync(admin, StationTestData.NewStation(lat + 0.2, lng));
        await (await admin.PostAsync($"/api/stations/{inactive.Id}/deactivate", null)).ShouldHaveStatusAsync(HttpStatusCode.OK);

        var url = FormattableString.Invariant($"/api/stations/nearby?lat={lat + 0.01}&lng={lng}&radiusKm=5");
        var response = await prosumerClient.GetAsync(url);
        var results = await response.ReadAsync<List<NearbyStationResponse>>();

        var found = Assert.Single(results, r => r.Id == near.Id);
        Assert.InRange(found.DistanceKm, 0.9, 1.3);
        Assert.DoesNotContain(results, r => r.Id == inactive.Id || r.Id == far.Id);
    }

    // The nearby search needs coordinates.
    [Fact]
    public async Task NearbySearch_WithoutCoordinates_Returns400()
    {
        var admin = await _factory.AdminClientAsync();

        var response = await admin.GetAsync("/api/stations/nearby");

        await response.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);
    }

    // An active reservation blocks deactivation until it is no longer active.
    [Fact]
    public async Task Deactivate_BlockedWhileReservationIsActive()
    {
        var admin = await _factory.AdminClientAsync();
        var station = await StationTestData.CreateAsync(admin);
        var booking = await TestDb.InsertReservationAsync(_factory, "200034501234", ReservationStatus.Approved,
            TimeSpan.FromDays(1), stationId: station.Id);

        var blocked = await admin.PostAsync($"/api/stations/{station.Id}/deactivate", null);
        var problem = await blocked.ReadProblemAsync(HttpStatusCode.BadRequest);
        Assert.Contains("active reservations", problem.Detail);

        await TestDb.SetReservationStatusAsync(_factory, booking.Id, ReservationStatus.Cancelled);

        var allowed = await (await admin.PostAsync($"/api/stations/{station.Id}/deactivate", null)).ReadAsync<StationResponse>();
        Assert.Equal(StationStatus.Inactive, allowed.Status);

        var reactivated = await (await admin.PostAsync($"/api/stations/{station.Id}/activate", null)).ReadAsync<StationResponse>();
        Assert.Equal(StationStatus.Active, reactivated.Status);
    }

    // A station that was never booked is deleted together with its slots.
    [Fact]
    public async Task DeleteStation_Unused_IsRemovedWithItsSlots()
    {
        var admin = await _factory.AdminClientAsync();
        var station = await StationTestData.CreateAsync(admin);
        var slot = await StationTestData.CreateSlotAsync(admin, station.Id, StationTestData.LocalToday().AddDays(1));

        var response = await admin.DeleteAsync($"/api/stations/{station.Id}");

        await response.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        await (await admin.GetAsync($"/api/stations/{station.Id}")).ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        await (await admin.GetAsync($"/api/slots/{slot.Id}")).ShouldHaveStatusAsync(HttpStatusCode.NotFound);
    }

    // A station with booking history cannot be deleted, and Grid Operators cannot delete at all.
    [Fact]
    public async Task DeleteStation_WithHistoryOrByOperator_IsRefused()
    {
        var admin = await _factory.AdminClientAsync();
        var station = await StationTestData.CreateAsync(admin);
        await TestDb.InsertReservationAsync(_factory, "200034501234", ReservationStatus.Completed,
            TimeSpan.FromDays(-2), 5, stationId: station.Id);

        var withHistory = await admin.DeleteAsync($"/api/stations/{station.Id}");
        var problem = await withHistory.ReadProblemAsync(HttpStatusCode.BadRequest);
        Assert.Contains("Deactivate it instead", problem.Detail);

        var operatorUser = await TestData.CreateStaffAsync(admin, UserRole.GridOperator);
        var operatorClient = await _factory.ClientForAsync(operatorUser.Email, TestData.StaffPassword);
        var byOperator = await operatorClient.DeleteAsync($"/api/stations/{station.Id}");
        await byOperator.ShouldHaveStatusAsync(HttpStatusCode.Forbidden);
    }

    // Prosumers never see inactive stations.
    [Fact]
    public async Task Prosumer_DoesNotSeeInactiveStations()
    {
        var admin = await _factory.AdminClientAsync();
        var (_, prosumerClient) = await ProsumerTestData.CreateActiveAsync(_factory);
        var station = await StationTestData.CreateAsync(admin);
        await (await admin.PostAsync($"/api/stations/{station.Id}/deactivate", null)).ShouldHaveStatusAsync(HttpStatusCode.OK);

        var list = await (await prosumerClient.GetAsync("/api/stations?status=Inactive")).ReadAsync<List<StationResponse>>();
        var single = await prosumerClient.GetAsync($"/api/stations/{station.Id}");

        Assert.DoesNotContain(list, s => s.Id == station.Id);
        Assert.All(list, s => Assert.Equal(StationStatus.Active, s.Status));
        await single.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
    }
}
