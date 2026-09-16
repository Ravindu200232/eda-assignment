/*
 * File:    ReservationRepository.cs
 * Module:  Data Access
 * Owner:   Ravindu
 * Purpose: MongoDB implementation of IReservationRepository.
 */
using System.Text.RegularExpressions;
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

    // True when a station still has pending or approved bookings that have not ended.
    public async Task<bool> HasActiveForStationAsync(string stationId, DateTime nowUtc)
    {
        if (!ObjectId.TryParse(stationId, out _))
            return false;

        return await _reservations
            .Find(r => r.StationId == stationId
                && (r.Status == ReservationStatus.Pending || r.Status == ReservationStatus.Approved)
                && r.EndTime > nowUtc)
            .AnyAsync();
    }

    // True when any booking, in any status, was ever made at the station.
    public async Task<bool> AnyForStationAsync(string stationId)
    {
        if (!ObjectId.TryParse(stationId, out _))
            return false;

        return await _reservations.Find(r => r.StationId == stationId).AnyAsync();
    }

    // One page of reservations that match the filter.
    public async Task<(IReadOnlyList<EnergyReservation> Items, long Total)> SearchAsync(ReservationFilter filter, int page, int pageSize)
    {
        var f = Builders<EnergyReservation>.Filter;
        var query = f.Empty;

        if (filter.ProsumerNic != null)
            query &= f.Eq(r => r.ProsumerNic, filter.ProsumerNic);

        if (filter.StationId != null)
        {
            if (!ObjectId.TryParse(filter.StationId, out _))
                return (Array.Empty<EnergyReservation>(), 0);

            query &= f.Eq(r => r.StationId, filter.StationId);
        }

        if (filter.Statuses is { Count: > 0 })
            query &= f.In(r => r.Status, filter.Statuses);

        if (filter.EndsAfterUtc.HasValue)
            query &= f.Gt(r => r.EndTime, filter.EndsAfterUtc.Value);

        if (filter.HistoryAtUtc.HasValue)
        {
            var finished = new[] { ReservationStatus.Completed, ReservationStatus.Cancelled, ReservationStatus.Rejected };
            query &= f.Or(f.In(r => r.Status, finished), f.Lte(r => r.EndTime, filter.HistoryAtUtc.Value));
        }

        if (filter.StartFromUtc.HasValue)
            query &= f.Gte(r => r.StartTime, filter.StartFromUtc.Value);

        if (filter.StartBeforeUtc.HasValue)
            query &= f.Lt(r => r.StartTime, filter.StartBeforeUtc.Value);

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var pattern = new BsonRegularExpression(Regex.Escape(filter.Search.Trim()), "i");
            query &= f.Or(
                f.Regex(r => r.ReferenceNo, pattern),
                f.Regex(r => r.StationName, pattern),
                f.Regex(r => r.ProsumerName, pattern),
                f.Regex(r => r.ProsumerNic, pattern));
        }

        var sort = filter.NewestFirst
            ? Builders<EnergyReservation>.Sort.Descending(r => r.StartTime)
            : Builders<EnergyReservation>.Sort.Ascending(r => r.StartTime);

        var total = await _reservations.CountDocumentsAsync(query);
        var items = await _reservations.Find(query)
            .Sort(sort)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();

        return (items, total);
    }

    // True when the prosumer already has a live booking that overlaps the window.
    public async Task<bool> HasOverlapForProsumerAsync(string prosumerNic, DateTime startUtc, DateTime endUtc, string? exceptId = null)
    {
        var f = Builders<EnergyReservation>.Filter;
        var query = f.Eq(r => r.ProsumerNic, prosumerNic)
            & f.In(r => r.Status, new[] { ReservationStatus.Pending, ReservationStatus.Approved })
            & f.Lt(r => r.StartTime, endUtc)
            & f.Gt(r => r.EndTime, startUtc);

        if (exceptId != null)
            query &= f.Ne(r => r.Id, exceptId);

        return await _reservations.Find(query).AnyAsync();
    }

    // Saves the reservation only if nobody changed its status in the meantime.
    public async Task<bool> ReplaceIfStatusAsync(EnergyReservation reservation, ReservationStatus expectedStatus)
    {
        var result = await _reservations.ReplaceOneAsync(
            r => r.Id == reservation.Id && r.Status == expectedStatus, reservation);

        return result.MatchedCount == 1;
    }
}
