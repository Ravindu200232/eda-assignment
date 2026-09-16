/*
 * File:    AuthFlowTests.cs
 * Module:  E2E Tests
 * Owner:   Ravindu
 * Purpose: Login, tokens and role checks over real HTTP calls.
 */
using System.Net;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.E2ETests.Infrastructure;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.E2ETests;

[Collection(ApiCollection.Name)]
public class AuthFlowTests
{
    private readonly ApiFactory _factory;

    // Receives the shared running API.
    public AuthFlowTests(ApiFactory factory)
    {
        _factory = factory;
    }

    // The health endpoint is public and reports the database connection.
    [Fact]
    public async Task Health_ReportsHealthyDatabase()
    {
        var response = await _factory.CreateClient().GetAsync("/api/health");
        var body = await response.ReadAsync<Dictionary<string, object>>();

        Assert.Equal("Healthy", body["status"].ToString());
    }

    // The seeded admin can log in and read their own profile.
    [Fact]
    public async Task Login_DefaultAdmin_ReturnsTokenAndProfile()
    {
        var login = await _factory.CreateClient().LoginAsync(ApiFactory.AdminEmail, ApiFactory.AdminPassword);
        var me = await _factory.ClientWithToken(login.Token).GetAsync("/api/auth/me");
        var profile = await me.ReadAsync<UserResponse>();

        Assert.False(string.IsNullOrEmpty(login.Token));
        Assert.True(login.ExpiresAt > DateTime.UtcNow);
        Assert.Equal(ApiFactory.AdminNic, profile.Nic);
        Assert.Equal(UserRole.Backoffice, profile.Role);
    }

    // A wrong password gives 401 with a readable message.
    [Fact]
    public async Task Login_WrongPassword_Returns401()
    {
        var response = await _factory.CreateClient().PostJsonAsync("/api/auth/login",
            new { username = ApiFactory.AdminEmail, password = "Wrong1234" });

        var problem = await response.ReadProblemAsync(HttpStatusCode.Unauthorized);
        Assert.Equal("Incorrect NIC/email or password.", problem.Detail);
    }

    // Missing fields give 400 with the field errors.
    [Fact]
    public async Task Login_MissingFields_Returns400()
    {
        var response = await _factory.CreateClient().PostJsonAsync("/api/auth/login", new { username = "" });

        var problem = await response.ReadProblemAsync(HttpStatusCode.BadRequest);
        Assert.Equal("Validation failed", problem.Title);
        Assert.False(string.IsNullOrEmpty(problem.Detail));
    }

    // Protected endpoints need a token.
    [Fact]
    public async Task ProtectedEndpoint_WithoutToken_Returns401()
    {
        var response = await _factory.CreateClient().GetAsync("/api/auth/me");

        var problem = await response.ReadProblemAsync(HttpStatusCode.Unauthorized);
        Assert.Equal("Please log in to continue.", problem.Detail);
    }

    // A token that was changed after signing is rejected.
    [Fact]
    public async Task ProtectedEndpoint_WithTamperedToken_Returns401()
    {
        var login = await _factory.CreateClient().LoginAsync(ApiFactory.AdminEmail, ApiFactory.AdminPassword);
        var tampered = login.Token[..^4] + "abcd";

        var response = await _factory.ClientWithToken(tampered).GetAsync("/api/auth/me");

        await response.ShouldHaveStatusAsync(HttpStatusCode.Unauthorized);
    }

    // Grid Operators cannot use Backoffice-only endpoints.
    [Fact]
    public async Task GridOperator_OnBackofficeEndpoint_Returns403()
    {
        var admin = await _factory.AdminClientAsync();
        var operatorUser = await TestData.CreateStaffAsync(admin, UserRole.GridOperator);
        var operatorClient = await _factory.ClientForAsync(operatorUser.Email, TestData.StaffPassword);

        var response = await operatorClient.GetAsync("/api/users");

        var problem = await response.ReadProblemAsync(HttpStatusCode.Forbidden);
        Assert.Equal("You do not have permission to do this.", problem.Detail);
    }

    // After a password change only the new password works.
    [Fact]
    public async Task ChangePassword_NewPasswordWorksAndOldOneFails()
    {
        var admin = await _factory.AdminClientAsync();
        var user = await TestData.CreateStaffAsync(admin, UserRole.GridOperator);
        var client = await _factory.ClientForAsync(user.Nic, TestData.StaffPassword);

        var change = await client.PostJsonAsync("/api/auth/change-password",
            new { currentPassword = TestData.StaffPassword, newPassword = "Changed5678" });
        await change.ShouldHaveStatusAsync(HttpStatusCode.NoContent);

        var oldLogin = await _factory.CreateClient().PostJsonAsync("/api/auth/login",
            new { username = user.Nic, password = TestData.StaffPassword });
        await oldLogin.ShouldHaveStatusAsync(HttpStatusCode.Unauthorized);

        var newLogin = await _factory.CreateClient().LoginAsync(user.Nic, "Changed5678");
        Assert.Equal(user.Nic, newLogin.User.Nic);
    }
}
