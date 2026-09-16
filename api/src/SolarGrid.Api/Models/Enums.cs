/*
 * File:    Enums.cs
 * Module:  Data Model
 * Owner:   Ravindu
 * Purpose: Fixed value lists used by the four collections.
 *          They are stored as text in MongoDB, e.g. "Pending".
 */
namespace SolarGrid.Api.Models;

public enum UserRole
{
    Backoffice,
    GridOperator,
    Prosumer
}

public enum AccountStatus
{
    Pending,      // registered from the mobile app, waiting for Backoffice
    Active,
    Deactivated
}

public enum StationStatus
{
    Active,
    Inactive
}

public enum TradeType
{
    Export,       // prosumer sends surplus solar energy into the station battery
    Import        // prosumer draws stored energy from the station battery
}

public enum ReservationStatus
{
    Pending,      // waiting for a Grid Operator or Backoffice approval
    Approved,     // QR code issued
    Rejected,
    Cancelled,
    Completed     // energy transfer finished at the station
}
