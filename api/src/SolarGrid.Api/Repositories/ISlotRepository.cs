/*
 * File:    ISlotRepository.cs
 * Module:  Data Access
 * Owner:   Ravindu
 * Purpose: Queries for the EnergyBookingSlots collection.
 */
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Repositories;

public interface ISlotRepository
{
    Task<EnergySlot?> GetByIdAsync(string id);

    Task<IReadOnlyList<EnergySlot>> ListByStationAsync(string stationId, DateTime fromUtc, DateTime toUtc);

    Task InsertAsync(EnergySlot slot);

    Task InsertManyAsync(IEnumerable<EnergySlot> slots);

    Task UpdateAsync(EnergySlot slot);

    Task DeleteAsync(string id);

    // Added by Nimthara to stop overlapping slots.
    Task<bool> HasOverlapAsync(string stationId, DateTime startUtc, DateTime endUtc);
}
