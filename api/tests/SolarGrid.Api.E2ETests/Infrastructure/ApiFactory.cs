/*
 * File:    ApiFactory.cs
 * Module:  E2E Tests
 * Owner:   Ravindu
 * Purpose: Starts the real API in memory against a throw-away MongoDB database.
 *          The database is dropped when the test run ends.
 */
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SolarGrid.Api.Data;

namespace SolarGrid.Api.E2ETests.Infrastructure;

// Source: API-07 (sources/api-sources.md) - integration tests with WebApplicationFactory.
public class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    // Default admin from appsettings.json.
    public const string AdminNic = "198512345678";
    public const string AdminEmail = "admin@solargrid.lk";
    public const string AdminPassword = "Admin@123";

    private readonly string _databaseName = $"SolarGridDb_E2E_{Guid.NewGuid():N}";

    // Uses the development settings, a unique database and no demo data.
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("MongoDb:DatabaseName", _databaseName);
        builder.UseSetting("App:SeedDemoData", "false");
    }

    // Starting the server runs index creation and the admin seed.
    public Task InitializeAsync()
    {
        _ = Server;
        return Task.CompletedTask;
    }

    // Removes the test database after the last test in the run.
    async Task IAsyncLifetime.DisposeAsync()
    {
        var settings = Services.GetRequiredService<IOptions<MongoSettings>>().Value;
        await new MongoClient(settings.ConnectionString).DropDatabaseAsync(_databaseName);
    }
}

[CollectionDefinition(Name)]
public class ApiCollection : ICollectionFixture<ApiFactory>
{
    // All E2E classes share one running API and one database.
    public const string Name = "Solar Grid API";
}
