/*
 * File:    IndexSetup.cs
 * Module:  Data Access
 * Owner:   Ravindu
 * Purpose: Creates the MongoDB indexes at startup. Unique indexes also stop
 *          duplicate emails, station codes and slot times at database level.
 */
using MongoDB.Driver;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Data;

// Source: API-12 (sources/api-sources.md) - creating indexes with the C# driver.
public class IndexSetup
{
    private readonly MongoDbContext _db;

    // Needs the database context only.
    public IndexSetup(MongoDbContext db)
    {
        _db = db;
    }

    // Creates every index. Running it again is safe because MongoDB skips existing ones.
    public async Task CreateAsync()
    {
        var userKeys = Builders<User>.IndexKeys;
        await _db.Users.Indexes.CreateManyAsync(new[]
        {
            new CreateIndexModel<User>(userKeys.Ascending(u => u.Email),
                new CreateIndexOptions { Unique = true, Name = "ux_email" }),
            new CreateIndexModel<User>(userKeys.Ascending(u => u.Role).Ascending(u => u.Status),
                new CreateIndexOptions { Name = "ix_role_status" })
        });

        var stationKeys = Builders<SolarStation>.IndexKeys;
        await _db.Stations.Indexes.CreateManyAsync(new[]
        {
            new CreateIndexModel<SolarStation>(stationKeys.Ascending(s => s.Code),
                new CreateIndexOptions { Unique = true, Name = "ux_code" }),
            new CreateIndexModel<SolarStation>(stationKeys.Geo2DSphere(s => s.Location),
                new CreateIndexOptions { Name = "ix_location_2dsphere" }),
            new CreateIndexModel<SolarStation>(stationKeys.Ascending(s => s.Status),
                new CreateIndexOptions { Name = "ix_status" })
        });

        var slotKeys = Builders<EnergySlot>.IndexKeys;
        await _db.Slots.Indexes.CreateOneAsync(
            new CreateIndexModel<EnergySlot>(slotKeys.Ascending(s => s.StationId).Ascending(s => s.StartTime),
                new CreateIndexOptions { Unique = true, Name = "ux_station_start" }));

        var reservationKeys = Builders<EnergyReservation>.IndexKeys;
        await _db.Reservations.Indexes.CreateManyAsync(new[]
        {
            new CreateIndexModel<EnergyReservation>(reservationKeys.Ascending(r => r.ReferenceNo),
                new CreateIndexOptions { Unique = true, Name = "ux_reference" }),
            new CreateIndexModel<EnergyReservation>(reservationKeys.Ascending(r => r.ProsumerNic).Ascending(r => r.StartTime),
                new CreateIndexOptions { Name = "ix_prosumer_start" }),
            new CreateIndexModel<EnergyReservation>(reservationKeys.Ascending(r => r.StationId).Ascending(r => r.Status),
                new CreateIndexOptions { Name = "ix_station_status" }),
            new CreateIndexModel<EnergyReservation>(reservationKeys.Ascending(r => r.Status).Ascending(r => r.StartTime),
                new CreateIndexOptions { Name = "ix_status_start" }),
            new CreateIndexModel<EnergyReservation>(reservationKeys.Ascending(r => r.SlotId),
                new CreateIndexOptions { Name = "ix_slot" })
        });
    }
}
