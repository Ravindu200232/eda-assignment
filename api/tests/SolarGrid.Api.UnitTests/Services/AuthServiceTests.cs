/*
 * File:    AuthServiceTests.cs
 * Module:  Unit Tests
 * Owner:   Ravindu
 * Purpose: Login and password-change rules.
 */
using NSubstitute;
using SolarGrid.Api.Common;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Models;
using SolarGrid.Api.Repositories;
using SolarGrid.Api.Security;
using SolarGrid.Api.Services;
using SolarGrid.Api.UnitTests.TestSupport;

namespace SolarGrid.Api.UnitTests.Services;

public class AuthServiceTests
{
    private readonly IUserRepository _users = Substitute.For<IUserRepository>();
    private readonly IJwtTokenService _tokens = Substitute.For<IJwtTokenService>();
    private readonly AppClock _clock = TestClock.Create().Clock;
    private readonly AuthService _service;

    // Wires the service to fake repositories and a fake token service.
    public AuthServiceTests()
    {
        _tokens.CreateToken(Arg.Any<User>()).Returns(new IssuedToken("token-123", _clock.UtcNow.AddHours(8)));
        _service = new AuthService(_users, TestUsers.Hasher, _tokens, _clock);
    }

    // Email login is case-insensitive and records the login time.
    [Fact]
    public async Task LoginAsync_EmailAndCorrectPassword_ReturnsToken()
    {
        var user = TestUsers.Staff("198512345678", UserRole.Backoffice);
        user.Email = "admin@test.lk";
        _users.GetByEmailAsync("admin@test.lk").Returns(user);

        var result = await _service.LoginAsync(Login(" Admin@Test.LK ", TestUsers.Password));

        Assert.Equal("token-123", result.Token);
        Assert.Equal(UserRole.Backoffice, result.User.Role);
        await _users.Received(1).SetLastLoginAsync("198512345678", _clock.UtcNow);
    }

    // An old NIC typed with a small "v" still finds the account.
    [Fact]
    public async Task LoginAsync_OldNicInLowerCase_FindsUser()
    {
        _users.GetByNicAsync("853400937V").Returns(TestUsers.Prosumer("853400937V"));

        var result = await _service.LoginAsync(Login("853400937v", TestUsers.Password));

        Assert.Equal("853400937V", result.User.Nic);
    }

    // A wrong password gives 401 without saying which part was wrong.
    [Fact]
    public async Task LoginAsync_WrongPassword_ThrowsUnauthorized()
    {
        _users.GetByNicAsync("853400937V").Returns(TestUsers.Prosumer("853400937V"));

        var error = await Assert.ThrowsAsync<UnauthorizedException>(() => _service.LoginAsync(Login("853400937V", "Wrong1234")));

        Assert.Equal("Incorrect NIC/email or password.", error.Message);
        _tokens.DidNotReceiveWithAnyArgs().CreateToken(default!);
    }

    // Unknown users get the same 401 message.
    [Fact]
    public async Task LoginAsync_UnknownUser_ThrowsUnauthorized()
    {
        await Assert.ThrowsAsync<UnauthorizedException>(() => _service.LoginAsync(Login("nobody@test.lk", TestUsers.Password)));
    }

    // New mobile sign-ups cannot log in until Backoffice activates them.
    [Fact]
    public async Task LoginAsync_PendingAccount_ThrowsForbidden()
    {
        _users.GetByNicAsync("200112304567").Returns(TestUsers.Prosumer("200112304567", AccountStatus.Pending));

        var error = await Assert.ThrowsAsync<ForbiddenException>(() => _service.LoginAsync(Login("200112304567", TestUsers.Password)));

        Assert.Contains("waiting for activation", error.Message);
    }

    // Deactivated accounts are blocked until reactivated.
    [Fact]
    public async Task LoginAsync_DeactivatedAccount_ThrowsForbidden()
    {
        _users.GetByNicAsync("882345678V").Returns(TestUsers.Prosumer("882345678V", AccountStatus.Deactivated));

        var error = await Assert.ThrowsAsync<ForbiddenException>(() => _service.LoginAsync(Login("882345678V", TestUsers.Password)));

        Assert.Contains("deactivated", error.Message);
    }

    // The current password must be confirmed before it can change.
    [Fact]
    public async Task ChangePasswordAsync_WrongCurrentPassword_Throws()
    {
        _users.GetByNicAsync("198512345678").Returns(TestUsers.Staff("198512345678", UserRole.Backoffice));

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.ChangePasswordAsync("198512345678",
            new ChangePasswordRequest { CurrentPassword = "Wrong1234", NewPassword = "NewPass123" }));
    }

    // The new password must follow the password policy.
    [Fact]
    public async Task ChangePasswordAsync_WeakNewPassword_Throws()
    {
        _users.GetByNicAsync("198512345678").Returns(TestUsers.Staff("198512345678", UserRole.Backoffice));

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => _service.ChangePasswordAsync("198512345678",
            new ChangePasswordRequest { CurrentPassword = TestUsers.Password, NewPassword = "short" }));

        Assert.Equal(PasswordPolicy.Message, error.Message);
    }

    // A valid change saves a new hash that matches the new password.
    [Fact]
    public async Task ChangePasswordAsync_Valid_SavesNewHash()
    {
        var user = TestUsers.Staff("198512345678", UserRole.Backoffice);
        _users.GetByNicAsync("198512345678").Returns(user);

        await _service.ChangePasswordAsync("198512345678",
            new ChangePasswordRequest { CurrentPassword = TestUsers.Password, NewPassword = "NewPass123" });

        Assert.True(TestUsers.Hasher.Verify("NewPass123", user.PasswordHash));
        await _users.Received(1).UpdateAsync(user);
    }

    // Asking for a profile that no longer exists gives 404.
    [Fact]
    public async Task GetProfileAsync_UnknownUser_ThrowsNotFound()
    {
        await Assert.ThrowsAsync<NotFoundException>(() => _service.GetProfileAsync("199912345678"));
    }

    // Shortcut for a login request.
    private static LoginRequest Login(string username, string password)
    {
        return new LoginRequest { Username = username, Password = password };
    }
}
