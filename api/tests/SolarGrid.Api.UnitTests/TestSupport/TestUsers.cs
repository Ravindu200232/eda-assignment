/*
 * File:    TestUsers.cs
 * Module:  Unit Tests
 * Owner:   Ravindu
 * Purpose: Ready-made user documents for service tests.
 */
using SolarGrid.Api.Models;
using SolarGrid.Api.Security;

namespace SolarGrid.Api.UnitTests.TestSupport;

public static class TestUsers
{
    public const string Password = "Secret123";

    // Work factor 4 keeps BCrypt fast inside tests.
    public static readonly IPasswordHasher Hasher = new PasswordHasher(workFactor: 4);

    // A Backoffice or Grid Operator account.
    public static User Staff(string nic, UserRole role, AccountStatus status = AccountStatus.Active)
    {
        return new User
        {
            Nic = nic,
            FullName = "Staff " + nic,
            Email = nic + "@staff.test",
            Phone = "0771234567",
            PasswordHash = Hasher.Hash(Password),
            Role = role,
            Status = status
        };
    }

    // A prosumer account.
    public static User Prosumer(string nic, AccountStatus status = AccountStatus.Active)
    {
        var user = Staff(nic, UserRole.Prosumer, status);
        user.FullName = "Prosumer " + nic;
        user.Email = nic.ToLowerInvariant() + "@home.test";
        user.Address = "No. 1, Test Road, Colombo";
        return user;
    }
}
