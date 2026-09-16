/*
 * File:    ISlotService.cs
 * Module:  Energy Slots
 * Owner:   Nimthara
 * Purpose: Creation and maintenance of bookable energy slots.
 */
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Security;

namespace SolarGrid.Api.Services;

public interface ISlotService
{
    Task<IReadOnlyList<SlotResponse>> ListForStationAsync(string stationId, DateOnly? from, DateOnly? to,
        bool onlyAvailable, CurrentUser caller);

    Task<SlotResponse> GetAsync(string id);

    Task<SlotResponse> CreateAsync(string stationId, CreateSlotRequest request);

    Task<GenerateSlotsResponse> GenerateAsync(string stationId, GenerateSlotsRequest request);

    Task<SlotResponse> UpdateAsync(string id, UpdateSlotRequest request);

    Task DeleteAsync(string id);
}
