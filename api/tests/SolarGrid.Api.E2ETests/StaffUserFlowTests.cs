/*
 * File:    StaffUserFlowTests.cs
 * Module:  E2E Tests
 * Owner:   Ravindu
 * Purpose: Backoffice management of staff accounts, end to end.
 */
using System.Net;
using SolarGrid.Api.Common;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.E2ETests.Infrastructure;
using SolarGrid.Api.Models;
using SolarGrid.Api.Security;

namespace SolarGrid.Api.E2ETests;

[Collection(ApiCollection.Name)]
public class StaffUserFlowTests
{
    private readonly ApiFactory _factory;

    // Receives the shared running API.
    public StaffUserFlowTests(ApiFactory factory)
    {
        _factory = factory;
    }

    // Create -> log in -> update -> deactivate (blocked) -> reactivate (allowed again).
    [Fact]
    public async Task Backoffice_ManagesGridOperatorLifecycle()
    {
        var admin = await _factory.AdminClientAsync();
        var user = await TestData.CreateStaffAsync(admin, UserRole.GridOperator);

        var firstLogin = await _factory.CreateClient().LoginAsync(user.Email, TestData.StaffPassword);
        Assert.Equal(UserRole.GridOperator, firstLogin.User.Role);

        var update = await admin.PutJsonAsync($"/api/users/{user.Nic}", new
        {
            fullName = "Renamed Operator",
            email = user.Email,
            phone = "0719998877",
            role = "GridOperator"
        });
        var updated = await update.ReadAsync<UserResponse>();
        Assert.Equal("Renamed Operator", updated.FullName);

        var deactivate = await admin.PatchJsonAsync($"/api/users/{user.Nic}/status", new { isActive = false });
        Assert.Equal(AccountStatus.Deactivated, (await deactivate.ReadAsync<UserResponse>()).Status);

        var blockedLogin = await _factory.CreateClient().PostJsonAsync("/api/auth/login",
            new { username = user.Email, password = TestData.StaffPassword });
        await blockedLogin.ShouldHaveStatusAsync(HttpStatusCode.Forbidden);

        var reactivate = await admin.PatchJsonAsync($"/api/users/{user.Nic}/status", new { isActive = true });
        await reactivate.ShouldHaveStatusAsync(HttpStatusCode.OK);

        var loginAgain = await _factory.CreateClient().LoginAsync(user.Email, TestData.StaffPassword);
        Assert.Equal(user.Nic, loginAgain.User.Nic);
    }

    // A second account with the same NIC is refused with 409.
    [Fact]
    public async Task CreateUser_DuplicateNic_Returns409()
    {
        var admin = await _factory.AdminClientAsync();
        var existing = await TestData.CreateStaffAsync(admin, UserRole.Backoffice);

        var response = await admin.PostJsonAsync("/api/users", new
        {
            nic = existing.Nic,
            fullName = "Copy Cat",
            email = TestData.NewEmail("copy"),
            phone = TestData.NewPhone(),
            password = TestData.StaffPassword,
            role = "GridOperator"
        });

        var problem = await response.ReadProblemAsync(HttpStatusCode.Conflict);
        Assert.Equal("A user with this NIC already exists.", problem.Detail);
    }

    // Business rule errors come back as 400 with the rule message.
    [Fact]
    public async Task CreateUser_WeakPassword_Returns400()
    {
        var admin = await _factory.AdminClientAsync();

        var response = await admin.PostJsonAsync("/api/users", new
        {
            nic = TestData.NewNic(),
            fullName = "Weak Password",
            email = TestData.NewEmail("weak"),
            phone = TestData.NewPhone(),
            password = "password",
            role = "GridOperator"
        });

        var problem = await response.ReadProblemAsync(HttpStatusCode.BadRequest);
        Assert.Equal(PasswordPolicy.Message, problem.Detail);
    }

    // An unknown role name is rejected and the field is named in the message.
    [Fact]
    public async Task CreateUser_UnknownRole_Returns400NamingTheField()
    {
        var admin = await _factory.AdminClientAsync();

        var response = await admin.PostJsonAsync("/api/users", new
        {
            nic = TestData.NewNic(),
            fullName = "Bad Role",
            email = TestData.NewEmail("role"),
            phone = TestData.NewPhone(),
            password = TestData.StaffPassword,
            role = "King"
        });

        var problem = await response.ReadProblemAsync(HttpStatusCode.BadRequest);
        Assert.Equal("'role' has an invalid value.", problem.Detail);
    }

    // The signed-in admin cannot deactivate their own account.
    [Fact]
    public async Task Backoffice_CannotDeactivateOwnAccount()
    {
        var admin = await _factory.AdminClientAsync();

        var response = await admin.PatchJsonAsync($"/api/users/{ApiFactory.AdminNic}/status", new { isActive = false });

        var problem = await response.ReadProblemAsync(HttpStatusCode.BadRequest);
        Assert.Equal("You cannot deactivate your own account.", problem.Detail);
    }

    // The role filter returns only accounts with that role.
    [Fact]
    public async Task ListUsers_FilterByRole_ReturnsOnlyThatRole()
    {
        var admin = await _factory.AdminClientAsync();
        await TestData.CreateStaffAsync(admin, UserRole.GridOperator);

        var response = await admin.GetAsync("/api/users?role=GridOperator&pageSize=100");
        var page = await response.ReadAsync<PagedResult<UserResponse>>();

        Assert.NotEmpty(page.Items);
        Assert.All(page.Items, u => Assert.Equal(UserRole.GridOperator, u.Role));
    }

    // Unknown NICs give 404.
    [Fact]
    public async Task GetUser_UnknownNic_Returns404()
    {
        var admin = await _factory.AdminClientAsync();

        var response = await admin.GetAsync($"/api/users/{TestData.NewNic()}");

        await response.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
    }
}
