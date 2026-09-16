/*
 * File:    SwaggerSetup.cs
 * Module:  Startup
 * Owner:   Ravindu
 * Purpose: Swagger UI for trying the API in a browser, with an Authorize
 *          button for pasting a JWT.
 */
using Microsoft.OpenApi;

namespace SolarGrid.Api.Extensions;

// Source: API-05 (sources/api-sources.md) - Swashbuckle setup with a bearer scheme.
public static class SwaggerSetup
{
    private const string SchemeName = "Bearer";

    // Registers the OpenAPI document and the JWT security scheme.
    public static IServiceCollection AddSwaggerWithJwt(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Smart Solar Microgrid Trading API",
                Version = "v1",
                Description = "Central service for the web and Android apps. "
                    + "Call POST /api/auth/login, then press Authorize and paste the token."
            });

            options.AddSecurityDefinition(SchemeName, new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                Description = "Paste the token from /api/auth/login (without the word Bearer)."
            });

            options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
            {
                [new OpenApiSecuritySchemeReference(SchemeName, document)] = new List<string>()
            });
        });

        return services;
    }
}
