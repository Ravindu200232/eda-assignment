/*
 * File:    TestDb.cs
 * Module:  E2E Tests
 * Owner:   Malith
 * Purpose: Puts bookings straight into the test database when a test only needs
 *          them as background data (the booking endpoints have their own tests).
 */
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson;
using MongoDB.Driver;
using SolarGrid.Api.Data;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.E2ETests.Infrastructure;

public static class TestDb
{
    // Inserts one reservation that starts after the given delay (negative = in the past).
    public static async Task<EnergyReservation> InsertReservationAsync(ApiFactory factory, string prosumerNic,
        ReservationStatus status, TimeSpan startsIn, double? deliveredKwh = null, string? stationId = null)
    {
        var now = DateTime.UtcNow;
        var start = now.Add(startsIn);
        var reservation = new EnergyReservation
        {
            Id = ObjectId.GenerateNewId().ToString(),
            ReferenceNo = "TEST-" + Guid.NewGuid().ToString("N")[..10].ToUpperInvariant(),
            ProsumerNic = prosumerNic,
            ProsumerName = "Test Prosumer",
            StationId = stationId ?? ObjectId.GenerateNewId().ToString(),
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

    // Changes a reservation's status directly (added by Nimthara).
    public static async Task SetReservationStatusAsync(ApiFactory factory, string reservationId, ReservationStatus status)
    {
        var db = factory.Services.GetRequiredService<MongoDbContext>();
        await db.Reservations.UpdateOneAsync(r => r.Id == reservationId,
            Builders<EnergyReservation>.Update.Set(r => r.Status, status));
    }

    // Marks bays of a slot as booked without going through the booking endpoints (added by Nimthara).
    public static async Task SetSlotBookedCountAsync(ApiFactory factory, string slotId, int bookedCount)
    {
        var db = factory.Services.GetRequiredService<MongoDbContext>();
        await db.Slots.UpdateOneAsync(s => s.Id == slotId,
            Builders<EnergySlot>.Update.Set(s => s.BookedCount, bookedCount));
    }
}
