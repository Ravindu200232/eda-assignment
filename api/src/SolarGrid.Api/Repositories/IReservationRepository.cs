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

    // Added by Nimthara for station deactivation and deletion.
    Task<bool> HasActiveForStationAsync(string stationId, DateTime nowUtc);

    Task<bool> AnyForStationAsync(string stationId);

    // Added by Hamnad for the booking workflow.
    Task<(IReadOnlyList<EnergyReservation> Items, long Total)> SearchAsync(ReservationFilter filter, int page, int pageSize);

    Task<bool> HasOverlapForProsumerAsync(string prosumerNic, DateTime startUtc, DateTime endUtc, string? exceptId = null);

    Task<bool> ReplaceIfStatusAsync(EnergyReservation reservation, ReservationStatus expectedStatus);
}
