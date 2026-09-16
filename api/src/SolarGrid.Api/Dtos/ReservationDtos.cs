/*
 * File:    ReservationDtos.cs
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: Request, filter and response shapes for energy reservations and their QR codes.
 */
using System.ComponentModel.DataAnnotations;
using SolarGrid.Api.Common;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Dtos;

public class CreateReservationRequest
{
    [Required(ErrorMessage = "Choose a slot.")]
    public string SlotId { get; set; } = string.Empty;

    [Required(ErrorMessage = "Energy amount is required.")]
    [Range(0.1, 100000, ErrorMessage = "Energy must be at least 0.1 kWh.")]
    public double? EnergyKwh { get; set; }

    [Required(ErrorMessage = "Choose Export or Import.")]
    public TradeType? TradeType { get; set; }

    // Staff only: the prosumer this booking is for.
    public string? ProsumerNic { get; set; }
}

public class UpdateReservationRequest
{
    [Required(ErrorMessage = "Choose a slot.")]
    public string SlotId { get; set; } = string.Empty;

    [Required(ErrorMessage = "Energy amount is required.")]
    [Range(0.1, 100000, ErrorMessage = "Energy must be at least 0.1 kWh.")]
    public double? EnergyKwh { get; set; }

    [Required(ErrorMessage = "Choose Export or Import.")]
    public TradeType? TradeType { get; set; }
}

public class CancelReservationRequest
{
    [StringLength(200, ErrorMessage = "Reason can have at most 200 characters.")]
    public string? Reason { get; set; }
}

public class RejectReservationRequest
{
    [Required(ErrorMessage = "Give a reason for rejecting the booking.")]
    [StringLength(200, MinimumLength = 3, ErrorMessage = "Reason must be 3 to 200 characters.")]
    public string Reason { get; set; } = string.Empty;
}

// Which list the apps are showing.
public enum ReservationScope
{
    Current,    // approved and not finished
    Pending,    // waiting for approval
    History     // completed, cancelled, rejected or already ended
}

public class ReservationQuery
{
    public ReservationScope? Scope { get; set; }

    public ReservationStatus? Status { get; set; }

    public string? StationId { get; set; }

    // Staff only: one prosumer's bookings.
    public string? Nic { get; set; }

    // Local dates (Sri Lanka), both included.
    public DateOnly? From { get; set; }

    public DateOnly? To { get; set; }

    // Reference number, station name, prosumer name or NIC.
    public string? Search { get; set; }

    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = PagedResult<ReservationResponse>.DefaultPageSize;
}

public class ReservationResponse
{
    public string Id { get; set; } = string.Empty;

    public string ReferenceNo { get; set; } = string.Empty;

    public string ProsumerNic { get; set; } = string.Empty;

    public string ProsumerName { get; set; } = string.Empty;

    public string StationId { get; set; } = string.Empty;

    public string StationName { get; set; } = string.Empty;

    public string SlotId { get; set; } = string.Empty;

    public DateTime StartTime { get; set; }

    public DateTime EndTime { get; set; }

    public TradeType TradeType { get; set; }

    public double EnergyKwh { get; set; }

    public double? DeliveredKwh { get; set; }

    public ReservationStatus Status { get; set; }

    public string? Reason { get; set; }

    public string CreatedBy { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public string? ApprovedBy { get; set; }

    public DateTime? ApprovedAt { get; set; }

    public string? RejectedBy { get; set; }

    public DateTime? RejectedAt { get; set; }

    public string? CancelledBy { get; set; }

    public DateTime? CancelledAt { get; set; }

    public string? CompletedBy { get; set; }

    public DateTime? CompletedAt { get; set; }

    // True while the booking can still be changed or cancelled (12-hour rule).
    public bool CanModify { get; set; }

    // Last moment for changes: 12 hours before the start.
    public DateTime ModifyDeadline { get; set; }

    public bool HasQrCode { get; set; }

    // True when the booking's time has already ended (used for "missed" bookings in history).
    public bool IsPast { get; set; }
}

public class QrCodeResponse
{
    public string ReservationId { get; set; } = string.Empty;

    public string ReferenceNo { get; set; } = string.Empty;

    public string StationName { get; set; } = string.Empty;

    public DateTime StartTime { get; set; }

    public DateTime EndTime { get; set; }

    // Text to draw as the QR image.
    public string Payload { get; set; } = string.Empty;
}

public static class ReservationMappings
{
    // Copies a reservation into a response. The service decides the rule flags.
    public static ReservationResponse ToResponse(this EnergyReservation r, bool canModify, DateTime modifyDeadline, bool isPast)
    {
        return new ReservationResponse
        {
            Id = r.Id,
            ReferenceNo = r.ReferenceNo,
            ProsumerNic = r.ProsumerNic,
            ProsumerName = r.ProsumerName,
            StationId = r.StationId,
            StationName = r.StationName,
            SlotId = r.SlotId,
            StartTime = r.StartTime,
            EndTime = r.EndTime,
            TradeType = r.TradeType,
            EnergyKwh = r.EnergyKwh,
            DeliveredKwh = r.DeliveredKwh,
            Status = r.Status,
            Reason = r.Reason,
            CreatedBy = r.CreatedBy,
            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt,
            ApprovedBy = r.ApprovedBy,
            ApprovedAt = r.ApprovedAt,
            RejectedBy = r.RejectedBy,
            RejectedAt = r.RejectedAt,
            CancelledBy = r.CancelledBy,
            CancelledAt = r.CancelledAt,
            CompletedBy = r.CompletedBy,
            CompletedAt = r.CompletedAt,
            CanModify = canModify,
            ModifyDeadline = modifyDeadline,
            HasQrCode = r.Status == ReservationStatus.Approved && !string.IsNullOrEmpty(r.QrNonce),
            IsPast = isPast
        };
    }
}
