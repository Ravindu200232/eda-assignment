/*
 * File:    ReservationTestData.cs
 * Module:  E2E Tests
 * Owner:   Hamnad
 * Purpose: Sets up a station, slots and a prosumer, and makes bookings through the real API.
 */
using System.Net;
using SolarGrid.Api.Dtos;

namespace SolarGrid.Api.E2ETests.Infrastructure;

// Everything a booking test needs, created fresh for each test.
public record BookingSetup(
    HttpClient Admin,
    UserResponse Prosumer,
    HttpClient ProsumerClient,
    StationResponse Station,
    SlotResponse Slot);

public static class ReservationTestData
{
    private static readonly TimeZoneInfo SriLanka = TimeZoneInfo.FindSystemTimeZoneById("Asia/Colombo");

    // A 24-hour station, a slot two days ahead (well over 12 hours away) and an active prosumer.
    public static async Task<BookingSetup> CreateSetupAsync(ApiFactory factory, int slotCapacity = 4)
    {
        var admin = await factory.AdminClientAsync();
        var (prosumer, prosumerClient) = await ProsumerTestData.CreateActiveAsync(factory);
        var station = await StationTestData.CreateAsync(admin);
        var slot = await StationTestData.CreateSlotAsync(admin, station.Id, StationTestData.LocalToday().AddDays(2),
            capacity: slotCapacity);

        return new BookingSetup(admin, prosumer, prosumerClient, station, slot);
    }

    // Books a slot and returns the new reservation.
    public static async Task<ReservationResponse> BookAsync(HttpClient client, string slotId,
        double energyKwh = 10, string tradeType = "Export", string? prosumerNic = null)
    {
        var response = await client.PostJsonAsync("/api/reservations",
            new { slotId, energyKwh, tradeType, prosumerNic });
        return await response.ReadAsync<ReservationResponse>(HttpStatusCode.Created);
    }

    // A 30-minute slot that starts one to two hours from now (inside the 12-hour limit).
    public static async Task<SlotResponse> CreateSoonSlotAsync(HttpClient admin, string stationId)
    {
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, SriLanka);
        var twoHoursOn = localNow.AddHours(2);
        var start = new DateTime(twoHoursOn.Year, twoHoursOn.Month, twoHoursOn.Day, twoHoursOn.Hour, 0, 0);

        return await StationTestData.CreateSlotAsync(admin, stationId, DateOnly.FromDateTime(start),
            start.ToString("HH:mm"), start.AddMinutes(30).ToString("HH:mm"));
    }

    // Reads a slot to check its booked bays.
    public static async Task<SlotResponse> GetSlotAsync(HttpClient client, string slotId)
    {
        return await (await client.GetAsync($"/api/slots/{slotId}")).ReadAsync<SlotResponse>();
    }
}
