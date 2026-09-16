/*
 * File:    ServiceSetup.cs
 * Module:  Startup
 * Owner:   Ravindu
 * Purpose: Registers settings, controllers, data access, business services
 *          and CORS so Program.cs stays short. New services are added here.
 */
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using SolarGrid.Api.Common;
using SolarGrid.Api.Data;
using SolarGrid.Api.Repositories;
using SolarGrid.Api.Security;
using SolarGrid.Api.Services;

namespace SolarGrid.Api.Extensions;

public static class ServiceSetup
{
    public const string CorsPolicyName = "WebApp";

    // Binds the settings sections and stops start-up when required values are missing.
    public static IServiceCollection AddAppSettings(this IServiceCollection services, IConfiguration config)
    {
        services.AddOptions<MongoSettings>()
            .Bind(config.GetSection(MongoSettings.SectionName))
            .Validate(s => !string.IsNullOrWhiteSpace(s.ConnectionString) && !string.IsNullOrWhiteSpace(s.DatabaseName),
                "MongoDb:ConnectionString and MongoDb:DatabaseName are required.")
            .ValidateOnStart();

        services.AddOptions<JwtSettings>()
            .Bind(config.GetSection(JwtSettings.SectionName))
            .Validate(s => s.Key.Length >= 32, "Jwt:Key must be at least 32 characters long.")
            .ValidateOnStart();

        services.AddOptions<AppSettings>()
            .Bind(config.GetSection(AppSettings.SectionName));

        services.AddSingleton(TimeProvider.System);
        services.AddSingleton(sp => new AppClock(
            sp.GetRequiredService<TimeProvider>(),
            sp.GetRequiredService<IOptions<AppSettings>>().Value.TimeZone));

        return services;
    }

    // Controllers with enum names in JSON and our own validation error format.
    public static IServiceCollection AddApiControllers(this IServiceCollection services)
    {
        services.AddProblemDetails();
        services.AddControllers()
            .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(allowIntegerValues: false)))
            .ConfigureApiBehaviorOptions(o => o.InvalidModelStateResponseFactory = ValidationResponse.Create);

        return services;
    }

    // MongoDB context, repositories and start-up database helpers.
    public static IServiceCollection AddDataAccess(this IServiceCollection services)
    {
        services.AddSingleton<MongoDbContext>();
        services.AddScoped<IndexSetup>();
        services.AddScoped<DataSeeder>();

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IStationRepository, StationRepository>();
        services.AddScoped<ISlotRepository, SlotRepository>();
        services.AddScoped<IReservationRepository, ReservationRepository>();

        return services;
    }

    // The service layer. Every business rule of the system lives in these classes.
    public static IServiceCollection AddBusinessServices(this IServiceCollection services)
    {
        services.AddSingleton<IPasswordHasher>(new PasswordHasher(workFactor: 11));
        services.AddSingleton<IJwtTokenService, JwtTokenService>();

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IProsumerService, ProsumerService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IStationService, StationService>();

        return services;
    }

    // Allows the React web app to call the API from its own address.
    public static IServiceCollection AddWebAppCors(this IServiceCollection services, IConfiguration config)
    {
        var origins = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();

        services.AddCors(options => options.AddPolicy(CorsPolicyName, policy =>
            policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));

        return services;
    }
}
