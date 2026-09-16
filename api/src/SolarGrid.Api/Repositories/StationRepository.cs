/*
 * File:    StationRepository.cs
 * Module:  Data Access
 * Owner:   Ravindu
 * Purpose: MongoDB implementation of IStationRepository.
 */
using System.Text.RegularExpressions;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;
using SolarGrid.Api.Data;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Repositories;

public class StationRepository : IStationRepository
{
    private readonly IMongoCollection<SolarStation> _stations;

    // Uses the SolarStationInfo collection from the shared context.
    public StationRepository(MongoDbContext db)
    {
        _stations = db.Stations;
    }

    // Finds a station by id. Returns null for ids that are not valid ObjectIds.
    public async Task<SolarStation?> GetByIdAsync(string id)
    {
        if (!ObjectId.TryParse(id, out _))
            return null;

        return await _stations.Find(s => s.Id == id).FirstOrDefaultAsync();
    }

    // Finds a station by its unique code, e.g. "SSG-MAL-01".
    public async Task<SolarStation?> GetByCodeAsync(string code)
    {
        return await _stations.Find(s => s.Code == code).FirstOrDefaultAsync();
    }

    // Lists stations, optionally filtered by status and a search text.
    public async Task<IReadOnlyList<SolarStation>> ListAsync(StationStatus? status, string? search)
    {
        var f = Builders<SolarStation>.Filter;
        var filter = f.Empty;

        if (status.HasValue)
            filter &= f.Eq(s => s.Status, status.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = new BsonRegularExpression(Regex.Escape(search.Trim()), "i");
            filter &= f.Or(f.Regex(s => s.Name, pattern), f.Regex(s => s.Code, pattern), f.Regex(s => s.Address, pattern));
        }

        return await _stations.Find(filter).SortBy(s => s.Name).ToListAsync();
    }

    // Adds a new station.
    public Task InsertAsync(SolarStation station)
    {
        return _stations.InsertOneAsync(station);
    }

    // Adds several stations at once (used by the seeder).
    public Task InsertManyAsync(IEnumerable<SolarStation> stations)
    {
        return _stations.InsertManyAsync(stations);
    }

    // Saves all changes to an existing station.
    public Task UpdateAsync(SolarStation station)
    {
        return _stations.ReplaceOneAsync(s => s.Id == station.Id, station);
    }

    // Counts stations, optionally in one status.
    public async Task<long> CountAsync(StationStatus? status = null)
    {
        var filter = status.HasValue
            ? Builders<SolarStation>.Filter.Eq(s => s.Status, status.Value)
            : Builders<SolarStation>.Filter.Empty;

        return await _stations.CountDocumentsAsync(filter);
    }

    // Active stations within a radius, nearest first, with the distance in km.
    // Source: API-14 (sources/api-sources.md) - $geoNear on a 2dsphere index.
    public async Task<IReadOnlyList<(SolarStation Station, double DistanceKm)>> FindNearbyAsync(
        double latitude, double longitude, double radiusKm, int limit)
    {
        var options = new GeoNearOptions<SolarStation, BsonDocument>
        {
            DistanceField = "distanceMeters",
            MaxDistance = radiusKm * 1000,
            Spherical = true,
            Query = Builders<SolarStation>.Filter.Eq(s => s.Status, StationStatus.Active)
        };

        var documents = await _stations.Aggregate()
            .GeoNear(SolarStation.ToPoint(latitude, longitude), options)
            .Limit(limit)
            .ToListAsync();

        return documents
            .Select(d => (BsonSerializer.Deserialize<SolarStation>(d), Math.Round(d["distanceMeters"].ToDouble() / 1000, 2)))
            .ToList();
    }
}
