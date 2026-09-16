/*
 * File:    User.cs
 * Module:  Data Model
 * Owner:   Ravindu
 * Purpose: A document in the "UserDetails" collection. Holds Backoffice staff,
 *          Grid Operators and solar prosumers. The NIC is the primary key.
 */
using MongoDB.Bson.Serialization.Attributes;

namespace SolarGrid.Api.Models;

public class User
{
    [BsonId]
    public string Nic { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Phone { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public UserRole Role { get; set; }

    public AccountStatus Status { get; set; }

    // Prosumer details (empty for staff)
    public string? Address { get; set; }

    public string? MeterNumber { get; set; }

    public double? SolarCapacityKw { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public string? ActivatedBy { get; set; }

    public DateTime? ActivatedAt { get; set; }

    public DateTime? DeactivatedAt { get; set; }

    public DateTime? LastLoginAt { get; set; }
}
