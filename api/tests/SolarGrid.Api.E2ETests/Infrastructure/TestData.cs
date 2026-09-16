/*
 * File:    TestData.cs
 * Module:  E2E Tests
 * Owner:   Ravindu
 * Purpose: Unique NICs, emails and phone numbers so tests never clash with each other.
 */
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.E2ETests.Infrastructure;

public static class TestData
{
    public const string StaffPassword = "Staff1234";

    // A valid 12-digit NIC: birth year, day of year, then a random serial.
    public static string NewNic()
    {
        var year = Random.Shared.Next(1960, 2006);
        var day = Random.Shared.Next(1, 366);
        var serial = Random.Shared.Next(0, 100000);
        return $"{year}{day:000}{serial:00000}";
    }

    // A unique email address.
    public static string NewEmail(string prefix)
    {
        return $"{prefix}.{Guid.NewGuid():N}@test.lk";
    }

    // A valid Sri Lankan mobile number.
    public static string NewPhone()
    {
        return "07" + Random.Shared.Next(10000000, 99999999);
    }

    // Creates a staff account through the API and returns it.
    public static async Task<UserResponse> CreateStaffAsync(HttpClient adminClient, UserRole role)
    {
        var response = await adminClient.PostJsonAsync("/api/users", new
        {
            nic = NewNic(),
            fullName = $"Test {role}",
            email = NewEmail(role.ToString().ToLowerInvariant()),
            phone = NewPhone(),
            password = StaffPassword,
            role
        });

        return await response.ReadAsync<UserResponse>(System.Net.HttpStatusCode.Created);
    }
}
