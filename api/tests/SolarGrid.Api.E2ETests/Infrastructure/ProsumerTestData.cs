/*
 * File:    ProsumerTestData.cs
 * Module:  E2E Tests
 * Owner:   Malith
 * Purpose: Creates prosumer accounts through the real API for end-to-end tests.
 */
using System.Net;
using SolarGrid.Api.Dtos;

namespace SolarGrid.Api.E2ETests.Infrastructure;

public static class ProsumerTestData
{
    public const string Password = "Prosumer123";

    // A registration body with a unique NIC, email and phone.
    public static Dictionary<string, object?> NewRegistration(string? nic = null)
    {
        return new Dictionary<string, object?>
        {
            ["nic"] = nic ?? TestData.NewNic(),
            ["fullName"] = "Test Prosumer",
            ["email"] = TestData.NewEmail("prosumer"),
            ["phone"] = TestData.NewPhone(),
            ["password"] = Password,
            ["address"] = "No. 10, Test Road, Colombo 05",
            ["meterNumber"] = "CEB-TEST-01",
            ["solarCapacityKw"] = 4.5
        };
    }

    // Registers a prosumer through the mobile sign-up endpoint.
    public static async Task<UserResponse> RegisterAsync(ApiFactory factory)
    {
        var response = await factory.CreateClient().PostJsonAsync("/api/prosumers/register", NewRegistration());
        return await response.ReadAsync<UserResponse>(HttpStatusCode.Created);
    }

    // Registers, activates as Backoffice and returns the prosumer with a signed-in client.
    public static async Task<(UserResponse Prosumer, HttpClient Client)> CreateActiveAsync(ApiFactory factory)
    {
        var prosumer = await RegisterAsync(factory);
        var admin = await factory.AdminClientAsync();

        var activate = await admin.PostAsync($"/api/prosumers/{prosumer.Nic}/activate", null);
        await activate.ShouldHaveStatusAsync(HttpStatusCode.OK);

        var client = await factory.ClientForAsync(prosumer.Nic, Password);
        return (prosumer, client);
    }
}
