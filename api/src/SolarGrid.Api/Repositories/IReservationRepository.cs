/*
 * File:    IReservationRepository.cs
 * Module:  Data Access
 * Owner:   Ravindu
 * Purpose: Queries for the EnergyReservations collection.
 */
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Repositories;

public interface IReservationRepository
{
    Task<EnergyReservation?> GetByIdAsync(string id);

    Task InsertAsync(EnergyReservation reservation);

    Task InsertManyAsync(IEnumerable<EnergyReservation> reservations);

    Task UpdateAsync(EnergyReservation reservation);
}
