/*
 * File:    AuthSetup.cs
 * Module:  Startup
 * Owner:   Ravindu
 * Purpose: JWT bearer authentication. Tokens are checked on every request and
 *          401/403 answers use the same JSON format as other errors.
 */
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using SolarGrid.Api.Common;
using SolarGrid.Api.Security;

namespace SolarGrid.Api.Extensions;

// Source: API-02 (sources/api-sources.md) - configuring JWT bearer authentication.
public static class AuthSetup
{
    // Reads the Jwt settings when the handler is first used, so tests can override them.
    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services)
    {
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();

        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<JwtSettings>>((options, jwtOptions) =>
            {
                var jwt = jwtOptions.Value;

                // Keep claim names short ("sub", "role") instead of long URIs.
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwt.Audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(1),
                    NameClaimType = JwtClaimNames.Name,
                    RoleClaimType = JwtClaimNames.Role
                };

                options.Events = new JwtBearerEvents
                {
                    OnChallenge = async context =>
                    {
                        context.HandleResponse();
                        var expired = context.AuthenticateFailure is SecurityTokenExpiredException;
                        await ProblemResponse.WriteAsync(context.HttpContext, StatusCodes.Status401Unauthorized, "Unauthorized",
                            expired ? "Your session has expired. Please log in again." : "Please log in to continue.");
                    },
                    OnForbidden = context => ProblemResponse.WriteAsync(context.HttpContext,
                        StatusCodes.Status403Forbidden, "Forbidden", "You do not have permission to do this.")
                };
            });

        services.AddAuthorization();
        return services;
    }
}
