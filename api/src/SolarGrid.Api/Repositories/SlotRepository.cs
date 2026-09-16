/*
 * File:    SlotRepository.cs
 * Module:  Data Access
 * Owner:   Ravindu
 * Purpose: MongoDB implementation of ISlotRepository.
 */
using MongoDB.Bson;
using MongoDB.Driver;
using SolarGrid.Api.Data;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Repositories;

public class SlotRepository : ISlotRepository
{
    private readonly IMongoCollection<EnergySlot> _slots;

    // Uses the EnergyBookingSlots collection from the shared context.
    public SlotRepository(MongoDbContext db)
    {
        _slots = db.Slots;
    }

    // Finds a slot by id. Returns null for ids that are not valid ObjectIds.
    public async Task<EnergySlot?> GetByIdAsync(string id)
    {
        if (!ObjectId.TryParse(id, out _))
            return null;

        return await _slots.Find(s => s.Id == id).FirstOrDefaultAsync();
    }

    // Lists a station's slots that start inside the given UTC range.
    public async Task<IReadOnlyList<EnergySlot>> ListByStationAsync(string stationId, DateTime fromUtc, DateTime toUtc)
    {
        if (!ObjectId.TryParse(stationId, out _))
            return Array.Empty<EnergySlot>();

        return await _slots
            .Find(s => s.StationId == stationId && s.StartTime >= fromUtc && s.StartTime < toUtc)
            .SortBy(s => s.StartTime)
            .ToListAsync();
    }

    // Adds a new slot.
    public Task InsertAsync(EnergySlot slot)
    {
        return _slots.InsertOneAsync(slot);
    }

    // Adds several slots at once.
    public Task InsertManyAsync(IEnumerable<EnergySlot> slots)
    {
        return _slots.InsertManyAsync(slots);
    }

    // Saves all changes to an existing slot.
    public Task UpdateAsync(EnergySlot slot)
    {
        return _slots.ReplaceOneAsync(s => s.Id == slot.Id, slot);
    }

    // Removes a slot.
    public Task DeleteAsync(string id)
    {
        return _slots.DeleteOneAsync(s => s.Id == id);
    }
}
