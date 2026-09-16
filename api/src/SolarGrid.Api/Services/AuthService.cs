/*
 * File:    AuthService.cs
 * Module:  Authentication
 * Owner:   Ravindu
 * Purpose: Login rules for all three roles. Only active accounts receive a token.
 */
using SolarGrid.Api.Common;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Models;
using SolarGrid.Api.Repositories;
using SolarGrid.Api.Security;

namespace SolarGrid.Api.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _hasher;
    private readonly IJwtTokenService _tokens;
    private readonly AppClock _clock;

    // Needs the user store, password hasher, token service and clock.
    public AuthService(IUserRepository users, IPasswordHasher hasher, IJwtTokenService tokens, AppClock clock)
    {
        _users = users;
        _hasher = hasher;
        _tokens = tokens;
        _clock = clock;
    }

    // Checks the credentials and account status, then issues a token.
    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await FindByLoginNameAsync(request.Username);
        if (user == null || !_hasher.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedException("Incorrect NIC/email or password.");

        if (user.Status == AccountStatus.Pending)
            throw new ForbiddenException("Your account is waiting for activation by the back office.");

        if (user.Status == AccountStatus.Deactivated)
            throw new ForbiddenException("This account is deactivated. Please contact the back office to reactivate it.");

        var now = _clock.UtcNow;
        await _users.SetLastLoginAsync(user.Nic, now);
        user.LastLoginAt = now;

        var token = _tokens.CreateToken(user);
        return new LoginResponse { Token = token.Token, ExpiresAt = token.ExpiresAt, User = user.ToResponse() };
    }

    // Returns the signed-in user's own details.
    public async Task<UserResponse> GetProfileAsync(string nic)
    {
        var user = await _users.GetByNicAsync(nic)
            ?? throw new NotFoundException("User account not found.");

        return user.ToResponse();
    }

    // Replaces the password after checking the current one.
    public async Task ChangePasswordAsync(string nic, ChangePasswordRequest request)
    {
        var user = await _users.GetByNicAsync(nic)
            ?? throw new NotFoundException("User account not found.");

        if (!_hasher.Verify(request.CurrentPassword, user.PasswordHash))
            throw new BusinessRuleException("Current password is incorrect.");

        PasswordPolicy.Ensure(request.NewPassword);

        user.PasswordHash = _hasher.Hash(request.NewPassword);
        user.UpdatedAt = _clock.UtcNow;
        await _users.UpdateAsync(user);
    }

    // Users may log in with either their NIC or their email.
    private Task<User?> FindByLoginNameAsync(string loginName)
    {
        var value = (loginName ?? string.Empty).Trim();
        return value.Contains('@')
            ? _users.GetByEmailAsync(value.ToLowerInvariant())
            : _users.GetByNicAsync(NicValidator.Normalize(value));
    }
}
