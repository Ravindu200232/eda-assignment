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
}
