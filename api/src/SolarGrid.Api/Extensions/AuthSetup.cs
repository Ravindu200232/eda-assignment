/*
 * File:    AuthSetup.cs
 * Module:  Startup
 * Owner:   Ravindu
 * Purpose: JWT bearer authentication. Tokens are checked on every request and
 *          401/403 answers use the same JSON format as other errors.
 */
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using SolarGrid.Api.Common;
using SolarGrid.Api.Models;
using SolarGrid.Api.Repositories;
using SolarGrid.Api.Security;

namespace SolarGrid.Api.Extensions;

// Source: API-02 (sources/api-sources.md) - configuring JWT bearer authentication.
public static class AuthSetup
{
    private const string InactiveAccountMessage = "This account is no longer active. Please contact the back office.";
    private const string RoleChangedMessage = "Your access level has changed. Please log in again.";

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
                    OnTokenValidated = RejectInactiveAccountsAsync,
                    OnChallenge = async context =>
                    {
                        context.HandleResponse();
                        await ProblemResponse.WriteAsync(context.HttpContext, StatusCodes.Status401Unauthorized,
                            "Unauthorized", ChallengeMessage(context.AuthenticateFailure));
                    },
                    OnForbidden = context => ProblemResponse.WriteAsync(context.HttpContext,
                        StatusCodes.Status403Forbidden, "Forbidden", "You do not have permission to do this.")
                };
            });

        services.AddAuthorization();
        return services;
    }

    // A token stays valid for hours, so check the account is still active and has the same role.
    private static async Task RejectInactiveAccountsAsync(TokenValidatedContext context)
    {
        var nic = context.Principal?.FindFirstValue(JwtClaimNames.Nic);
        var role = context.Principal?.FindFirstValue(JwtClaimNames.Role);
        var users = context.HttpContext.RequestServices.GetRequiredService<IUserRepository>();
        var user = string.IsNullOrEmpty(nic) ? null : await users.GetByNicAsync(nic);

        if (user == null || user.Status != AccountStatus.Active)
            context.Fail(InactiveAccountMessage);
        else if (user.Role.ToString() != role)
            context.Fail(RoleChangedMessage);
    }

    // Picks the 401 message that explains why the token was not accepted.
    private static string ChallengeMessage(Exception? failure)
    {
        return failure switch
        {
            SecurityTokenExpiredException => "Your session has expired. Please log in again.",
            { Message: InactiveAccountMessage or RoleChangedMessage } => failure.Message,
            _ => "Please log in to continue."
        };
    }
}
