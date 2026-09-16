/*
 * File:    DashboardDtos.cs
 * Module:  Dashboards
 * Owner:   Malith
 * Purpose: Summary numbers and short booking lists for the web and mobile dashboards.
 */
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Dtos;

public class StaffDashboardResponse
{
    public long PendingReservations { get; set; }

    public long ApprovedFutureReservations { get; set; }

    public long TodaysReservations { get; set; }

    public long ActiveStations { get; set; }

    public long TotalStations { get; set; }

    public long PendingActivations { get; set; }

    public long ActiveProsumers { get; set; }

    public IReadOnlyList<ReservationSummary> UpcomingReservations { get; set; } = Array.Empty<ReservationSummary>();

    public DateTime GeneratedAt { get; set; }
}

public class ProsumerDashboardResponse
{
    public long PendingCount { get; set; }

    public long ApprovedFutureCount { get; set; }

    public long CompletedCount { get; set; }

    public double TotalDeliveredKwh { get; set; }

    public ReservationSummary? NextReservation { get; set; }

    public IReadOnlyList<ReservationSummary> UpcomingReservations { get; set; } = Array.Empty<ReservationSummary>();

    public DateTime GeneratedAt { get; set; }
}

public class PublicSummaryResponse
{
    public long ActiveStations { get; set; }

    public long ActiveProsumers { get; set; }

    public long CompletedTransfers { get; set; }

    public double TotalEnergyTradedKwh { get; set; }
}

// A short booking line for dashboard cards.
public class ReservationSummary
{
    public string Id { get; set; } = string.Empty;

    public string ReferenceNo { get; set; } = string.Empty;

    public string ProsumerNic { get; set; } = string.Empty;

    public string ProsumerName { get; set; } = string.Empty;

    public string StationName { get; set; } = string.Empty;

    public DateTime StartTime { get; set; }

    public DateTime EndTime { get; set; }

    public TradeType TradeType { get; set; }

    public double EnergyKwh { get; set; }

    public ReservationStatus Status { get; set; }
}

public static class DashboardMappings
{
    // Copies the fields a dashboard card needs.
    public static ReservationSummary ToSummary(this EnergyReservation reservation)
    {
        return new ReservationSummary
        {
            Id = reservation.Id,
            ReferenceNo = reservation.ReferenceNo,
            ProsumerNic = reservation.ProsumerNic,
            ProsumerName = reservation.ProsumerName,
            StationName = reservation.StationName,
            StartTime = reservation.StartTime,
            EndTime = reservation.EndTime,
            TradeType = reservation.TradeType,
            EnergyKwh = reservation.EnergyKwh,
            Status = reservation.Status
        };
    }
}
