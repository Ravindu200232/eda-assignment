/*
 * File:    EnergyReservation.cs
 * Module:  Data Model
 * Owner:   Ravindu
 * Purpose: A document in the "EnergyReservations" collection - a prosumer's
 *          booking of one bay in an energy slot.
 *          Station and prosumer names are copied in so lists need no joins.
 */
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SolarGrid.Api.Models;

public class EnergyReservation
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    public string ReferenceNo { get; set; } = string.Empty;

    public string ProsumerNic { get; set; } = string.Empty;

    public string ProsumerName { get; set; } = string.Empty;

    [BsonRepresentation(BsonType.ObjectId)]
    public string StationId { get; set; } = string.Empty;

    public string StationName { get; set; } = string.Empty;

    [BsonRepresentation(BsonType.ObjectId)]
    public string SlotId { get; set; } = string.Empty;

    public DateTime StartTime { get; set; }

    public DateTime EndTime { get; set; }

    public TradeType TradeType { get; set; }

    public double EnergyKwh { get; set; }

    public double? DeliveredKwh { get; set; }

    public ReservationStatus Status { get; set; }

    // Random value inside the QR code. A new one makes old QR codes invalid.
    public string? QrNonce { get; set; }

    // Why the booking was rejected or cancelled.
    public string? Reason { get; set; }

    public string CreatedBy { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public string? ApprovedBy { get; set; }

    public DateTime? ApprovedAt { get; set; }

    // Added by Hamnad for the approval workflow.
    public string? RejectedBy { get; set; }

    public DateTime? RejectedAt { get; set; }

    public string? CancelledBy { get; set; }

    public DateTime? CancelledAt { get; set; }

    public string? CompletedBy { get; set; }

    public DateTime? CompletedAt { get; set; }
}
