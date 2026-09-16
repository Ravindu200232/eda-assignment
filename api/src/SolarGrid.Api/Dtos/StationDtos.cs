/*
 * File:    StationDtos.cs
 * Module:  Microgrid Stations
 * Owner:   Nimthara
 * Purpose: Request and response shapes for solar stations and their schedules.
 */
using System.ComponentModel.DataAnnotations;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Dtos;

public class StationRequest
{
    [Required(ErrorMessage = "Station code is required.")]
    [RegularExpression(@"^[A-Za-z0-9][A-Za-z0-9-]{2,19}$",
        ErrorMessage = "Station code must be 3 to 20 letters, numbers or dashes, e.g. SSG-MAL-01.")]
    public string Code { get; set; } = string.Empty;

    [Required(ErrorMessage = "Station name is required.")]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "Station name must be 3 to 100 characters.")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Address is required.")]
    [StringLength(200, MinimumLength = 5, ErrorMessage = "Address must be 5 to 200 characters.")]
    public string Address { get; set; } = string.Empty;

    [Required(ErrorMessage = "Latitude is required.")]
    [Range(-90, 90, ErrorMessage = "Latitude must be between -90 and 90.")]
    public double? Latitude { get; set; }

    [Required(ErrorMessage = "Longitude is required.")]
    [Range(-180, 180, ErrorMessage = "Longitude must be between -180 and 180.")]
    public double? Longitude { get; set; }

    [Required(ErrorMessage = "Solar capacity is required.")]
    [Range(0.1, 100000, ErrorMessage = "Solar capacity must be between 0.1 and 100000 kW.")]
    public double? SolarCapacityKw { get; set; }

    [Required(ErrorMessage = "Storage capacity is required.")]
    [Range(0.1, 1000000, ErrorMessage = "Storage capacity must be between 0.1 and 1000000 kWh.")]
    public double? StorageCapacityKwh { get; set; }

    [Required(ErrorMessage = "Number of battery slots is required.")]
    [Range(1, 500, ErrorMessage = "Battery slots must be between 1 and 500.")]
    public int? TotalBatterySlots { get; set; }

    // Used only when creating a station. Empty means 06:00-18:00 every day.
    public List<OperatingHoursDto>? Schedule { get; set; }
}

public class OperatingHoursDto
{
    [Required(ErrorMessage = "Day is required.")]
    public DayOfWeek? Day { get; set; }

    [Required(ErrorMessage = "Opening time is required.")]
    public string OpenTime { get; set; } = string.Empty;

    [Required(ErrorMessage = "Closing time is required.")]
    public string CloseTime { get; set; } = string.Empty;
}

public class ScheduleRequest
{
    [Required(ErrorMessage = "Schedule is required.")]
    [MinLength(1, ErrorMessage = "Add at least one opening day.")]
    public List<OperatingHoursDto> Schedule { get; set; } = new();
}

public class BatterySlotsRequest
{
    [Required(ErrorMessage = "Available battery slots is required.")]
    [Range(0, 500, ErrorMessage = "Available battery slots must be between 0 and 500.")]
    public int? AvailableBatterySlots { get; set; }
}

public class StationResponse
{
    public string Id { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public double SolarCapacityKw { get; set; }

    public double StorageCapacityKwh { get; set; }

    public int TotalBatterySlots { get; set; }

    public int AvailableBatterySlots { get; set; }

    // Most energy one booking can use (storage divided by battery slots).
    public double BayCapacityKwh { get; set; }

    public List<OperatingHoursDto> Schedule { get; set; } = new();

    public StationStatus Status { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}

public class NearbyStationResponse : StationResponse
{
    public double DistanceKm { get; set; }
}

public static class StationMappings
{
    // Copies a station document into a response.
    public static StationResponse ToResponse(this SolarStation station)
    {
        return Fill(new StationResponse(), station);
    }

    // Same as ToResponse, plus the distance from the searched point.
    public static NearbyStationResponse ToNearbyResponse(this SolarStation station, double distanceKm)
    {
        var response = Fill(new NearbyStationResponse(), station);
        response.DistanceKm = distanceKm;
        return response;
    }

    // Shared field copy for both response types.
    private static T Fill<T>(T response, SolarStation station) where T : StationResponse
    {
        response.Id = station.Id;
        response.Code = station.Code;
        response.Name = station.Name;
        response.Address = station.Address;
        response.Latitude = station.Latitude;
        response.Longitude = station.Longitude;
        response.SolarCapacityKw = station.SolarCapacityKw;
        response.StorageCapacityKwh = station.StorageCapacityKwh;
        response.TotalBatterySlots = station.TotalBatterySlots;
        response.AvailableBatterySlots = station.AvailableBatterySlots;
        response.BayCapacityKwh = station.BayCapacityKwh();
        response.Schedule = station.Schedule
            .OrderBy(h => h.Day)
            .Select(h => new OperatingHoursDto { Day = h.Day, OpenTime = h.OpenTime, CloseTime = h.CloseTime })
            .ToList();
        response.Status = station.Status;
        response.CreatedAt = station.CreatedAt;
        response.UpdatedAt = station.UpdatedAt;
        return response;
    }
}
