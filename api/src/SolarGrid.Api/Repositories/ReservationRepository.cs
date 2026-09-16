/*
 * File:    ReservationRepository.cs
 * Module:  Data Access
 * Owner:   Ravindu
 * Purpose: MongoDB implementation of IReservationRepository.
 */
using MongoDB.Bson;
using MongoDB.Driver;
using SolarGrid.Api.Data;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Repositories;

public class ReservationRepository : IReservationRepository
{
    private readonly IMongoCollection<EnergyReservation> _reservations;

    // Uses the EnergyReservations collection from the shared context.
    public ReservationRepository(MongoDbContext db)
    {
        _reservations = db.Reservations;
    }

    // Finds a reservation by id. Returns null for ids that are not valid ObjectIds.
    public async Task<EnergyReservation?> GetByIdAsync(string id)
    {
        if (!ObjectId.TryParse(id, out _))
            return null;

        return await _reservations.Find(r => r.Id == id).FirstOrDefaultAsync();
    }

    // Adds a new reservation.
    public Task InsertAsync(EnergyReservation reservation)
    {
        return _reservations.InsertOneAsync(reservation);
    }

    // Adds several reservations at once (used by the seeder).
    public Task InsertManyAsync(IEnumerable<EnergyReservation> reservations)
    {
        return _reservations.InsertManyAsync(reservations);
    }

    // Saves all changes to an existing reservation.
    public Task UpdateAsync(EnergyReservation reservation)
    {
        return _reservations.ReplaceOneAsync(r => r.Id == reservation.Id, reservation);
    }

    // True when the prosumer has a pending or approved booking that has not ended yet.
    public async Task<bool> HasActiveForProsumerAsync(string prosumerNic, DateTime nowUtc)
    {
        return await _reservations
            .Find(r => r.ProsumerNic == prosumerNic
                && (r.Status == ReservationStatus.Pending || r.Status == ReservationStatus.Approved)
                && r.EndTime > nowUtc)
            .AnyAsync();
    }

    // Counts bookings in one status, optionally only future ones or one prosumer's.
    public async Task<long> CountAsync(ReservationStatus status, DateTime? startsAfterUtc = null, string? prosumerNic = null)
    {
        var f = Builders<EnergyReservation>.Filter;
        var filter = f.Eq(r => r.Status, status);

        if (startsAfterUtc.HasValue)
            filter &= f.Gt(r => r.StartTime, startsAfterUtc.Value);

        if (prosumerNic != null)
            filter &= f.Eq(r => r.ProsumerNic, prosumerNic);

        return await _reservations.CountDocumentsAsync(filter);
    }

    // Counts live bookings (not cancelled or rejected) that start inside a UTC range.
    public async Task<long> CountStartingBetweenAsync(DateTime fromUtc, DateTime toUtc)
    {
        return await _reservations.CountDocumentsAsync(r =>
            r.StartTime >= fromUtc && r.StartTime < toUtc
            && r.Status != ReservationStatus.Cancelled
            && r.Status != ReservationStatus.Rejected);
    }

    // Next pending or approved bookings, soonest first.
    public async Task<IReadOnlyList<EnergyReservation>> ListUpcomingAsync(DateTime nowUtc, int limit, string? prosumerNic = null)
    {
        var f = Builders<EnergyReservation>.Filter;
        var filter = f.In(r => r.Status, new[] { ReservationStatus.Pending, ReservationStatus.Approved })
            & f.Gt(r => r.StartTime, nowUtc);

        if (prosumerNic != null)
            filter &= f.Eq(r => r.ProsumerNic, prosumerNic);

        return await _reservations.Find(filter).SortBy(r => r.StartTime).Limit(limit).ToListAsync();
    }

    // Number of completed transfers and the energy delivered, using a MongoDB aggregation.
    // Source: API-13 (sources/api-sources.md) - $match + $group with the C# driver.
    public async Task<(long Count, double TotalKwh)> GetCompletedTotalsAsync(string? prosumerNic = null)
    {
        var f = Builders<EnergyReservation>.Filter;
        var filter = f.Eq(r => r.Status, ReservationStatus.Completed);
        if (prosumerNic != null)
            filter &= f.Eq(r => r.ProsumerNic, prosumerNic);

        var totals = await _reservations.Aggregate()
            .Match(filter)
            .Group(r => r.Status, g => new { Count = g.Count(), Energy = g.Sum(r => r.DeliveredKwh) })
            .FirstOrDefaultAsync();

        return totals == null ? (0, 0) : (totals.Count, totals.Energy ?? 0);
    }
}
