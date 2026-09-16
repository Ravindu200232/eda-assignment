/*
 * File:    TestDb.cs
 * Module:  E2E Tests
 * Owner:   Malith
 * Purpose: Puts bookings straight into the test database when a test only needs
 *          them as background data (the booking endpoints have their own tests).
 */
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson;
using SolarGrid.Api.Data;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.E2ETests.Infrastructure;

public static class TestDb
{
    // Inserts one reservation that starts after the given delay (negative = in the past).
    public static async Task<EnergyReservation> InsertReservationAsync(ApiFactory factory, string prosumerNic,
        ReservationStatus status, TimeSpan startsIn, double? deliveredKwh = null)
    {
        var now = DateTime.UtcNow;
        var start = now.Add(startsIn);
        var reservation = new EnergyReservation
        {
            Id = ObjectId.GenerateNewId().ToString(),
            ReferenceNo = "TEST-" + Guid.NewGuid().ToString("N")[..10].ToUpperInvariant(),
            ProsumerNic = prosumerNic,
            ProsumerName = "Test Prosumer",
            StationId = ObjectId.GenerateNewId().ToString(),
            StationName = "Test Station",
            SlotId = ObjectId.GenerateNewId().ToString(),
            StartTime = start,
            EndTime = start.AddHours(2),
            TradeType = TradeType.Export,
            EnergyKwh = 5,
            DeliveredKwh = deliveredKwh,
            Status = status,
            CreatedBy = prosumerNic,
            CreatedAt = now,
            UpdatedAt = now
        };

        var db = factory.Services.GetRequiredService<MongoDbContext>();
        await db.Reservations.InsertOneAsync(reservation);
        return reservation;
    }
}
