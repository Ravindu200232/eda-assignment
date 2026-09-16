/*
 * File:    StationTestData.cs
 * Module:  E2E Tests
 * Owner:   Nimthara
 * Purpose: Creates stations and slots through the real API for end-to-end tests.
 */
using System.Net;
using SolarGrid.Api.Dtos;

namespace SolarGrid.Api.E2ETests.Infrastructure;

public static class StationTestData
{
    private static readonly TimeZoneInfo SriLanka = TimeZoneInfo.FindSystemTimeZoneById("Asia/Colombo");

    // Today's date in Sri Lanka.
    public static DateOnly LocalToday()
    {
        return DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, SriLanka));
    }

    // A station body with a unique code. A 24-hour schedule makes slot tests independent of the time of day.
    public static Dictionary<string, object?> NewStation(double latitude = 7.0, double longitude = 80.0,
        string open = "00:00", string close = "24:00")
    {
        return new Dictionary<string, object?>
        {
            ["code"] = "E2E-" + Guid.NewGuid().ToString("N")[..8].ToUpperInvariant(),
            ["name"] = "E2E Test Microgrid",
            ["address"] = "No. 1, Test Lane, Colombo",
            ["latitude"] = latitude,
            ["longitude"] = longitude,
            ["solarCapacityKw"] = 90,
            ["storageCapacityKwh"] = 300,
            ["totalBatterySlots"] = 6,
            ["schedule"] = Enum.GetNames<DayOfWeek>()
                .Select(day => new { day, openTime = open, closeTime = close })
                .ToList()
        };
    }

    // Creates a station as Backoffice.
    public static async Task<StationResponse> CreateAsync(HttpClient adminClient, Dictionary<string, object?>? body = null)
    {
        var response = await adminClient.PostJsonAsync("/api/stations", body ?? NewStation());
        return await response.ReadAsync<StationResponse>(HttpStatusCode.Created);
    }

    // Creates a two-hour slot on a local date.
    public static async Task<SlotResponse> CreateSlotAsync(HttpClient staffClient, string stationId, DateOnly date,
        string start = "10:00", string end = "12:00", int? capacity = null)
    {
        var response = await staffClient.PostJsonAsync($"/api/stations/{stationId}/slots",
            new { date = date.ToString("yyyy-MM-dd"), startTime = start, endTime = end, capacity });
        return await response.ReadAsync<SlotResponse>(HttpStatusCode.Created);
    }
}
