/*
 * File:    EnergySlot.cs
 * Module:  Data Model
 * Owner:   Ravindu
 * Purpose: A document in the "EnergyBookingSlots" collection - a time window
 *          at a station with a number of battery bays that can be booked.
 */
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SolarGrid.Api.Models;

public class EnergySlot
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonRepresentation(BsonType.ObjectId)]
    public string StationId { get; set; } = string.Empty;

    public DateTime StartTime { get; set; }

    public DateTime EndTime { get; set; }

    // Bays that can be booked in this window.
    public int Capacity { get; set; }

    // Bays taken by pending, approved or completed reservations.
    public int BookedCount { get; set; }

    public bool IsOpen { get; set; } = true;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    [BsonIgnore]
    public int AvailableBays => Math.Max(0, Capacity - BookedCount);
}
