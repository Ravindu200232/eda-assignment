/*
 * File:    IStationService.cs
 * Module:  Microgrid Stations
 * Owner:   Nimthara
 * Purpose: Management and search of solar microgrid stations.
 */
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Models;
using SolarGrid.Api.Security;

namespace SolarGrid.Api.Services;

public interface IStationService
{
    Task<IReadOnlyList<StationResponse>> ListAsync(StationStatus? status, string? search, CurrentUser caller);

    Task<StationResponse> GetAsync(string id, CurrentUser caller);

    Task<IReadOnlyList<NearbyStationResponse>> FindNearbyAsync(double? latitude, double? longitude, double? radiusKm);

    Task<StationResponse> CreateAsync(StationRequest request);

    Task<StationResponse> UpdateAsync(string id, StationRequest request);

    Task<StationResponse> UpdateScheduleAsync(string id, ScheduleRequest request);

    Task<StationResponse> UpdateBatterySlotsAsync(string id, BatterySlotsRequest request);

    Task<StationResponse> DeactivateAsync(string id);

    Task<StationResponse> ActivateAsync(string id);
}
