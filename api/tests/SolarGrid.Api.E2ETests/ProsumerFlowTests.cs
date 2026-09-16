/*
 * File:    ProsumerFlowTests.cs
 * Module:  E2E Tests
 * Owner:   Malith
 * Purpose: Prosumer registration, activation, profile and deactivation over real HTTP calls.
 */
using System.Net;
using SolarGrid.Api.Common;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.E2ETests.Infrastructure;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.E2ETests;

[Collection(ApiCollection.Name)]
public class ProsumerFlowTests
{
    private readonly ApiFactory _factory;

    // Receives the shared running API.
    public ProsumerFlowTests(ApiFactory factory)
    {
        _factory = factory;
    }

    // Register -> blocked -> activated -> edit -> deactivate -> blocked -> reactivated.
    [Fact]
    public async Task Prosumer_FullAccountLifecycle()
    {
        var anonymous = _factory.CreateClient();
        var admin = await _factory.AdminClientAsync();

        var prosumer = await ProsumerTestData.RegisterAsync(_factory);
        Assert.Equal(AccountStatus.Pending, prosumer.Status);

        var pendingLogin = await anonymous.PostJsonAsync("/api/auth/login",
            new { username = prosumer.Nic, password = ProsumerTestData.Password });
        var pendingProblem = await pendingLogin.ReadProblemAsync(HttpStatusCode.Forbidden);
        Assert.Contains("waiting for activation", pendingProblem.Detail);

        var queue = await (await admin.GetAsync("/api/prosumers/pending-activations")).ReadAsync<List<UserResponse>>();
        Assert.Contains(queue, p => p.Nic == prosumer.Nic);

        var activated = await (await admin.PostAsync($"/api/prosumers/{prosumer.Nic}/activate", null)).ReadAsync<UserResponse>();
        Assert.Equal(AccountStatus.Active, activated.Status);

        var client = await _factory.ClientForAsync(prosumer.Email, ProsumerTestData.Password);
        var updated = await (await client.PutJsonAsync("/api/prosumers/me", new
        {
            fullName = "Updated Prosumer",
            email = prosumer.Email,
            phone = "0770001122",
            address = "No. 20, Updated Road, Kandy",
            solarCapacityKw = 6.0
        })).ReadAsync<UserResponse>();
        Assert.Equal("Updated Prosumer", updated.FullName);
        Assert.Null(updated.MeterNumber);

        var wrongPassword = await client.PostJsonAsync("/api/prosumers/me/deactivate", new { password = "Wrong1234" });
        await wrongPassword.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);

        var deactivate = await client.PostJsonAsync("/api/prosumers/me/deactivate", new { password = ProsumerTestData.Password });
        await deactivate.ShouldHaveStatusAsync(HttpStatusCode.NoContent);

        var afterDeactivation = await client.GetAsync("/api/prosumers/me");
        await afterDeactivation.ShouldHaveStatusAsync(HttpStatusCode.Unauthorized);

        var deactivatedList = await (await admin.GetAsync("/api/prosumers?status=Deactivated&pageSize=100"))
            .ReadAsync<PagedResult<UserResponse>>();
        Assert.Contains(deactivatedList.Items, p => p.Nic == prosumer.Nic);

        var reactivate = await admin.PostAsync($"/api/prosumers/{prosumer.Nic}/activate", null);
        await reactivate.ShouldHaveStatusAsync(HttpStatusCode.OK);

        var loginAgain = await anonymous.LoginAsync(prosumer.Nic, ProsumerTestData.Password);
        Assert.Equal(UserRole.Prosumer, loginAgain.User.Role);
    }

    // The NIC is the primary key, so it cannot be registered twice.
    [Fact]
    public async Task Register_DuplicateNic_Returns409()
    {
        var existing = await ProsumerTestData.RegisterAsync(_factory);

        var response = await _factory.CreateClient().PostJsonAsync("/api/prosumers/register",
            ProsumerTestData.NewRegistration(existing.Nic));

        var problem = await response.ReadProblemAsync(HttpStatusCode.Conflict);
        Assert.Equal("An account with this NIC already exists.", problem.Detail);
    }

    // Invalid NIC numbers are refused with a clear message.
    [Fact]
    public async Task Register_InvalidNic_Returns400()
    {
        var response = await _factory.CreateClient().PostJsonAsync("/api/prosumers/register",
            ProsumerTestData.NewRegistration("12345X"));

        var problem = await response.ReadProblemAsync(HttpStatusCode.BadRequest);
        Assert.Equal(NicValidator.FormatMessage, problem.Detail);
    }

    // Missing required fields are listed in the validation response.
    [Fact]
    public async Task Register_MissingAddress_Returns400WithFieldError()
    {
        var body = ProsumerTestData.NewRegistration();
        body.Remove("address");

        var response = await _factory.CreateClient().PostJsonAsync("/api/prosumers/register", body);

        var problem = await response.ReadProblemAsync(HttpStatusCode.BadRequest);
        Assert.Equal("Address is required.", problem.Detail);
    }

    // Grid Operators can create prosumers but only Backoffice can activate them.
    [Fact]
    public async Task GridOperator_CanCreateProsumer_ButCannotActivate()
    {
        var admin = await _factory.AdminClientAsync();
        var operatorUser = await TestData.CreateStaffAsync(admin, UserRole.GridOperator);
        var operatorClient = await _factory.ClientForAsync(operatorUser.Email, TestData.StaffPassword);

        var created = await (await operatorClient.PostJsonAsync("/api/prosumers", ProsumerTestData.NewRegistration()))
            .ReadAsync<UserResponse>(HttpStatusCode.Created);
        Assert.Equal(AccountStatus.Active, created.Status);

        var deactivate = await operatorClient.PostAsync($"/api/prosumers/{created.Nic}/deactivate", null);
        await deactivate.ShouldHaveStatusAsync(HttpStatusCode.OK);

        var activate = await operatorClient.PostAsync($"/api/prosumers/{created.Nic}/activate", null);
        await activate.ShouldHaveStatusAsync(HttpStatusCode.Forbidden);
    }

    // Prosumers cannot reach staff screens.
    [Fact]
    public async Task Prosumer_CannotUseStaffEndpoints()
    {
        var (_, client) = await ProsumerTestData.CreateActiveAsync(_factory);

        await (await client.GetAsync("/api/prosumers")).ShouldHaveStatusAsync(HttpStatusCode.Forbidden);
        await (await client.GetAsync("/api/prosumers/pending-activations")).ShouldHaveStatusAsync(HttpStatusCode.Forbidden);
    }

    // Staff accounts cannot use the prosumer self-service endpoints.
    [Fact]
    public async Task Staff_CannotUseProsumerSelfService()
    {
        var admin = await _factory.AdminClientAsync();

        var response = await admin.GetAsync("/api/prosumers/me");

        await response.ShouldHaveStatusAsync(HttpStatusCode.Forbidden);
    }

    // An upcoming booking blocks deactivation.
    [Fact]
    public async Task Deactivate_WithUpcomingBooking_Returns400()
    {
        var (prosumer, client) = await ProsumerTestData.CreateActiveAsync(_factory);
        await TestDb.InsertReservationAsync(_factory, prosumer.Nic, ReservationStatus.Approved, TimeSpan.FromDays(2));

        var response = await client.PostJsonAsync("/api/prosumers/me/deactivate", new { password = ProsumerTestData.Password });

        var problem = await response.ReadProblemAsync(HttpStatusCode.BadRequest);
        Assert.Contains("upcoming reservations", problem.Detail);
    }

    // Backoffice can reject a new sign-up by deactivating it.
    [Fact]
    public async Task Backoffice_CanDeactivatePendingSignUp()
    {
        var prosumer = await ProsumerTestData.RegisterAsync(_factory);
        var admin = await _factory.AdminClientAsync();

        var result = await (await admin.PostAsync($"/api/prosumers/{prosumer.Nic}/deactivate", null)).ReadAsync<UserResponse>();

        Assert.Equal(AccountStatus.Deactivated, result.Status);
        var queue = await (await admin.GetAsync("/api/prosumers/pending-activations")).ReadAsync<List<UserResponse>>();
        Assert.DoesNotContain(queue, p => p.Nic == prosumer.Nic);
    }
}
