/*
 * File:    TestStations.cs
 * Module:  Unit Tests
 * Owner:   Nimthara
 * Purpose: Ready-made station and slot documents for service tests.
 */
using SolarGrid.Api.Models;

namespace SolarGrid.Api.UnitTests.TestSupport;

public static class TestStations
{
    public const string StationId = "6aaa95c6e007313fe4c1933a";
    public const string SlotId = "6aaa95c6e007313fe4c19340";

    // Open 06:00-18:00 every day except Saturday; 8 bays, 4 available now.
    public static SolarStation Station(StationStatus status = StationStatus.Active)
    {
        return new SolarStation
        {
            Id = StationId,
            Code = "SSG-TST-01",
            Name = "Test Microgrid",
            Address = "Test Road, Malabe",
            Location = SolarStation.ToPoint(6.9147, 79.9729),
            SolarCapacityKw = 100,
            StorageCapacityKwh = 400,
            TotalBatterySlots = 8,
            AvailableBatterySlots = 4,
            Schedule = Enum.GetValues<DayOfWeek>()
                .Where(d => d != DayOfWeek.Saturday)
                .Select(d => new OperatingHours { Day = d, OpenTime = "06:00", CloseTime = "18:00" })
                .ToList(),
            Status = status
        };
    }

    // A slot with the given UTC window and booking count.
    public static EnergySlot Slot(DateTime startUtc, int capacity = 4, int booked = 0, bool isOpen = true)
    {
        return new EnergySlot
        {
            Id = SlotId,
            StationId = StationId,
            StartTime = startUtc,
            EndTime = startUtc.AddHours(2),
            Capacity = capacity,
            BookedCount = booked,
            IsOpen = isOpen
        };
    }
}
