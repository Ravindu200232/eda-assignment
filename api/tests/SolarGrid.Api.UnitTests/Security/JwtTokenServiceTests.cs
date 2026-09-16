/*
 * File:    JwtTokenServiceTests.cs
 * Module:  Unit Tests
 * Owner:   Ravindu
 * Purpose: Checks the claims, lifetime and signature of issued tokens.
 */
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using SolarGrid.Api.Models;
using SolarGrid.Api.Security;
using SolarGrid.Api.UnitTests.TestSupport;

namespace SolarGrid.Api.UnitTests.Security;

public class JwtTokenServiceTests
{
    private const string Key = "unit-test-signing-key-0123456789-abcdef";

    // The token carries the NIC, role and expiry the clients rely on.
    [Fact]
    public void CreateToken_IncludesUserClaimsAndExpiry()
    {
        var (clock, _) = TestClock.Create();
        var service = CreateService(clock);
        var user = TestUsers.Prosumer("200034501234");

        var issued = service.CreateToken(user);
        var jwt = new JsonWebTokenHandler().ReadJsonWebToken(issued.Token);

        Assert.Equal("200034501234", jwt.Subject);
        Assert.Equal("Prosumer", jwt.GetClaim(JwtClaimNames.Role).Value);
        Assert.Equal(user.Email, jwt.GetClaim(JwtClaimNames.Email).Value);
        Assert.Equal("test-issuer", jwt.Issuer);
        Assert.Equal(clock.UtcNow.AddHours(8), issued.ExpiresAt);
    }

    // A token signed with our key passes validation; a different key fails.
    [Fact]
    public async Task CreateToken_IsSignedWithConfiguredKey()
    {
        var (clock, _) = TestClock.Create();
        var token = CreateService(clock).CreateToken(TestUsers.Staff("198512345678", UserRole.Backoffice)).Token;
        var handler = new JsonWebTokenHandler();

        var good = await handler.ValidateTokenAsync(token, ValidationFor(Key));
        var bad = await handler.ValidateTokenAsync(token, ValidationFor("another-key-that-is-long-enough-000000"));

        Assert.True(good.IsValid);
        Assert.False(bad.IsValid);
    }

    // Builds the service with test settings.
    private static JwtTokenService CreateService(SolarGrid.Api.Common.AppClock clock)
    {
        var settings = Options.Create(new JwtSettings
        {
            Key = Key,
            Issuer = "test-issuer",
            Audience = "test-audience",
            ExpiryHours = 8
        });
        return new JwtTokenService(settings, clock);
    }

    // Lifetime is not checked because the test clock is not the real time.
    private static TokenValidationParameters ValidationFor(string key)
    {
        return new TokenValidationParameters
        {
            ValidIssuer = "test-issuer",
            ValidAudience = "test-audience",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            ValidateLifetime = false
        };
    }
}
