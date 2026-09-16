/*
 * File:    IStationRepository.cs
 * Module:  Data Access
 * Owner:   Ravindu
 * Purpose: Queries for the SolarStationInfo collection.
 */
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Repositories;

public interface IStationRepository
{
    Task<SolarStation?> GetByIdAsync(string id);

    Task<SolarStation?> GetByCodeAsync(string code);

    Task<IReadOnlyList<SolarStation>> ListAsync(StationStatus? status, string? search);

    Task InsertAsync(SolarStation station);

    Task InsertManyAsync(IEnumerable<SolarStation> stations);

    Task UpdateAsync(SolarStation station);

    // Added by Malith for dashboards.
    Task<long> CountAsync(StationStatus? status = null);
}
