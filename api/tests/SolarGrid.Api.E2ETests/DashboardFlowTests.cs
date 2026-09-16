/*
 * File:    DashboardFlowTests.cs
 * Module:  E2E Tests
 * Owner:   Malith
 * Purpose: Dashboard numbers read live from the database, and who may see them.
 */
using System.Net;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.E2ETests.Infrastructure;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.E2ETests;

[Collection(ApiCollection.Name)]
public class DashboardFlowTests
{
    private readonly ApiFactory _factory;

    // Receives the shared running API.
    public DashboardFlowTests(ApiFactory factory)
    {
        _factory = factory;
    }

    // The home page numbers need no login.
    [Fact]
    public async Task PublicSummary_WorksWithoutLogin()
    {
        var summary = await (await _factory.CreateClient().GetAsync("/api/dashboard/public"))
            .ReadAsync<PublicSummaryResponse>();

        Assert.True(summary.ActiveStations >= 0);
        Assert.True(summary.TotalEnergyTradedKwh >= 0);
    }

    // New future bookings show up in the staff counts straight away.
    [Fact]
    public async Task StaffSummary_CountsNewPendingAndApprovedBookings()
    {
        var admin = await _factory.AdminClientAsync();
        var before = await (await admin.GetAsync("/api/dashboard/summary")).ReadAsync<StaffDashboardResponse>();

        await TestDb.InsertReservationAsync(_factory, "200034501234", ReservationStatus.Pending, TimeSpan.FromDays(3));
        await TestDb.InsertReservationAsync(_factory, "200034501234", ReservationStatus.Approved, TimeSpan.FromDays(3));
        await TestDb.InsertReservationAsync(_factory, "200034501234", ReservationStatus.Approved, TimeSpan.FromDays(-3));

        var after = await (await admin.GetAsync("/api/dashboard/summary")).ReadAsync<StaffDashboardResponse>();

        Assert.Equal(before.PendingReservations + 1, after.PendingReservations);
        Assert.Equal(before.ApprovedFutureReservations + 1, after.ApprovedFutureReservations);
    }

    // A prosumer sees only their own bookings and totals.
    [Fact]
    public async Task ProsumerSummary_ShowsOwnBookingsOnly()
    {
        var (prosumer, client) = await ProsumerTestData.CreateActiveAsync(_factory);
        var (_, otherClient) = await ProsumerTestData.CreateActiveAsync(_factory);

        var soon = await TestDb.InsertReservationAsync(_factory, prosumer.Nic, ReservationStatus.Approved, TimeSpan.FromHours(20));
        await TestDb.InsertReservationAsync(_factory, prosumer.Nic, ReservationStatus.Pending, TimeSpan.FromDays(4));
        await TestDb.InsertReservationAsync(_factory, prosumer.Nic, ReservationStatus.Completed, TimeSpan.FromDays(-1), 7.5);
        await TestDb.InsertReservationAsync(_factory, prosumer.Nic, ReservationStatus.Cancelled, TimeSpan.FromDays(2));

        var mine = await (await client.GetAsync("/api/dashboard/my-summary")).ReadAsync<ProsumerDashboardResponse>();
        var other = await (await otherClient.GetAsync("/api/dashboard/my-summary")).ReadAsync<ProsumerDashboardResponse>();

        Assert.Equal(1, mine.PendingCount);
        Assert.Equal(1, mine.ApprovedFutureCount);
        Assert.Equal(1, mine.CompletedCount);
        Assert.Equal(7.5, mine.TotalDeliveredKwh);
        Assert.Equal(soon.ReferenceNo, mine.NextReservation?.ReferenceNo);
        Assert.Equal(2, mine.UpcomingReservations.Count);

        Assert.Equal(0, other.PendingCount);
        Assert.Null(other.NextReservation);
    }

    // Each dashboard is only open to its own audience.
    [Fact]
    public async Task DashboardEndpoints_EnforceRoles()
    {
        var admin = await _factory.AdminClientAsync();
        var (_, prosumerClient) = await ProsumerTestData.CreateActiveAsync(_factory);

        await (await prosumerClient.GetAsync("/api/dashboard/summary")).ShouldHaveStatusAsync(HttpStatusCode.Forbidden);
        await (await admin.GetAsync("/api/dashboard/my-summary")).ShouldHaveStatusAsync(HttpStatusCode.Forbidden);
        await (await _factory.CreateClient().GetAsync("/api/dashboard/summary")).ShouldHaveStatusAsync(HttpStatusCode.Unauthorized);
    }
}
