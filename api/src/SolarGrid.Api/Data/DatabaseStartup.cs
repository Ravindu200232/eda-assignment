/*
 * File:    DatabaseStartup.cs
 * Module:  Data Access
 * Owner:   Ravindu
 * Purpose: Prepares MongoDB (indexes + seed data) when the API starts.
 */
namespace SolarGrid.Api.Data;

public static class DatabaseStartup
{
    // Runs index creation and seeding inside a short-lived service scope.
    public static async Task InitialiseDatabaseAsync(this IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<DataSeeder>>();

        try
        {
            await scope.ServiceProvider.GetRequiredService<IndexSetup>().CreateAsync();
            await scope.ServiceProvider.GetRequiredService<DataSeeder>().SeedAsync();
        }
        catch (TimeoutException ex)
        {
            // Keep the API running so /api/health can report the problem.
            logger.LogError(ex, "MongoDB is not reachable. Indexes and seed data were skipped; restart the API once MongoDB is running.");
        }
    }
}
