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

    // Added by Malith for prosumer deactivation and dashboards.
    Task<bool> HasActiveForProsumerAsync(string prosumerNic, DateTime nowUtc);

    Task<long> CountAsync(ReservationStatus status, DateTime? startsAfterUtc = null, string? prosumerNic = null);

    Task<long> CountStartingBetweenAsync(DateTime fromUtc, DateTime toUtc);

    Task<IReadOnlyList<EnergyReservation>> ListUpcomingAsync(DateTime nowUtc, int limit, string? prosumerNic = null);

    Task<(long Count, double TotalKwh)> GetCompletedTotalsAsync(string? prosumerNic = null);
}
