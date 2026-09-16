/*
 * File:    SlotDtos.cs
 * Module:  Energy Slots
 * Owner:   Nimthara
 * Purpose: Request and response shapes for bookable energy slots.
 *          Requests use Sri Lanka local dates and "HH:mm" times; responses return UTC times.
 */
using System.ComponentModel.DataAnnotations;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Dtos;

public class CreateSlotRequest
{
    [Required(ErrorMessage = "Date is required.")]
    public DateOnly? Date { get; set; }

    [Required(ErrorMessage = "Start time is required.")]
    [RegularExpression(SlotPatterns.Time, ErrorMessage = SlotPatterns.TimeMessage)]
    public string StartTime { get; set; } = string.Empty;

    [Required(ErrorMessage = "End time is required.")]
    [RegularExpression(SlotPatterns.Time, ErrorMessage = SlotPatterns.TimeMessage)]
    public string EndTime { get; set; } = string.Empty;

    // Leave empty to use the station's available battery slots.
    [Range(1, 500, ErrorMessage = "Capacity must be between 1 and 500.")]
    public int? Capacity { get; set; }
}

public class GenerateSlotsRequest
{
    // First local date to fill. Empty means today.
    public DateOnly? FromDate { get; set; }

    [Range(1, 7, ErrorMessage = "Slots can be generated for 1 to 7 days.")]
    public int Days { get; set; } = 7;

    [Range(30, 480, ErrorMessage = "Slot length must be between 30 and 480 minutes.")]
    public int SlotMinutes { get; set; } = 120;

    [Range(1, 500, ErrorMessage = "Capacity must be between 1 and 500.")]
    public int? Capacity { get; set; }
}

public class UpdateSlotRequest
{
    [Required(ErrorMessage = "Capacity is required.")]
    [Range(1, 500, ErrorMessage = "Capacity must be between 1 and 500.")]
    public int? Capacity { get; set; }

    [Required(ErrorMessage = "Say whether the slot is open.")]
    public bool? IsOpen { get; set; }
}

public class SlotResponse
{
    public string Id { get; set; } = string.Empty;

    public string StationId { get; set; } = string.Empty;

    public DateTime StartTime { get; set; }

    public DateTime EndTime { get; set; }

    public int Capacity { get; set; }

    public int BookedCount { get; set; }

    public int AvailableBays { get; set; }

    public bool IsOpen { get; set; }
}

public class GenerateSlotsResponse
{
    public int Created { get; set; }

    public int Skipped { get; set; }

    public IReadOnlyList<SlotResponse> Slots { get; set; } = Array.Empty<SlotResponse>();
}

public static class SlotPatterns
{
    public const string Time = @"^(([01]\d|2[0-3]):[0-5]\d|24:00)$";
    public const string TimeMessage = "Time must be in HH:mm format, e.g. 08:30.";
}

public static class SlotMappings
{
    // Copies a slot document into a response.
    public static SlotResponse ToResponse(this EnergySlot slot)
    {
        return new SlotResponse
        {
            Id = slot.Id,
            StationId = slot.StationId,
            StartTime = slot.StartTime,
            EndTime = slot.EndTime,
            Capacity = slot.Capacity,
            BookedCount = slot.BookedCount,
            AvailableBays = slot.AvailableBays,
            IsOpen = slot.IsOpen
        };
    }
}
