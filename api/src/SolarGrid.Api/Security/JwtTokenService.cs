/*
 * File:    JwtTokenService.cs
 * Module:  Security
 * Owner:   Ravindu
 * Purpose: Creates signed JWT access tokens after a successful login.
 */
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using SolarGrid.Api.Common;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Security;

public interface IJwtTokenService
{
    IssuedToken CreateToken(User user);
}

public record IssuedToken(string Token, DateTime ExpiresAt);

// Source: API-02 (sources/api-sources.md) - JWT bearer tokens in ASP.NET Core.
public class JwtTokenService : IJwtTokenService
{
    private readonly JwtSettings _settings;
    private readonly AppClock _clock;

    // Needs the token settings and the clock.
    public JwtTokenService(IOptions<JwtSettings> settings, AppClock clock)
    {
        _settings = settings.Value;
        _clock = clock;
    }

    // Builds a token that carries the user's NIC, name, email and role.
    public IssuedToken CreateToken(User user)
    {
        var now = _clock.UtcNow;
        var expiresAt = now.AddHours(_settings.ExpiryHours);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Key));

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = _settings.Issuer,
            Audience = _settings.Audience,
            IssuedAt = now,
            NotBefore = now,
            Expires = expiresAt,
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256),
            Claims = new Dictionary<string, object>
            {
                [JwtClaimNames.Nic] = user.Nic,
                [JwtClaimNames.Name] = user.FullName,
                [JwtClaimNames.Email] = user.Email,
                [JwtClaimNames.Role] = user.Role.ToString()
            }
        };

        var token = new JsonWebTokenHandler().CreateToken(descriptor);
        return new IssuedToken(token, expiresAt);
    }
}
