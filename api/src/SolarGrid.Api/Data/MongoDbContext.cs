/*
 * File:    MongoDbContext.cs
 * Module:  Data Access
 * Owner:   Ravindu
 * Purpose: Single entry point to MongoDB. Exposes the four collections used by
 *          the system: UserDetails, SolarStationInfo, EnergyBookingSlots and
 *          EnergyReservations.
 */
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Conventions;
using MongoDB.Driver;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Data;

// Source: API-01 (sources/api-sources.md) - settings class + shared MongoClient pattern.
public class MongoDbContext
{
    private static readonly object ConventionLock = new();
    private static bool _conventionsRegistered;

    // Opens the database named in settings. Registered once as a singleton.
    public MongoDbContext(IOptions<MongoSettings> options)
    {
        RegisterConventions();

        var settings = options.Value;
        var clientSettings = MongoClientSettings.FromConnectionString(settings.ConnectionString);

        // Fail fast (5 s instead of 30 s) when the MongoDB service is stopped.
        clientSettings.ServerSelectionTimeout = TimeSpan.FromSeconds(5);

        Database = new MongoClient(clientSettings).GetDatabase(settings.DatabaseName);
    }

    public IMongoDatabase Database { get; }

    public IMongoCollection<User> Users => Database.GetCollection<User>("UserDetails");

    public IMongoCollection<SolarStation> Stations => Database.GetCollection<SolarStation>("SolarStationInfo");

    public IMongoCollection<EnergySlot> Slots => Database.GetCollection<EnergySlot>("EnergyBookingSlots");

    public IMongoCollection<EnergyReservation> Reservations => Database.GetCollection<EnergyReservation>("EnergyReservations");

    // Sends a ping so the health endpoint can report the database state.
    public async Task<bool> PingAsync()
    {
        try
        {
            await Database.RunCommandAsync((Command<BsonDocument>)"{ ping: 1 }");
            return true;
        }
        catch (Exception)
        {
            return false;
        }
    }

    // Source: API-10 (sources/api-sources.md) - camelCase names, enums as text, no empty fields.
    private static void RegisterConventions()
    {
        lock (ConventionLock)
        {
            if (_conventionsRegistered)
                return;

            var pack = new ConventionPack
            {
                new CamelCaseElementNameConvention(),
                new EnumRepresentationConvention(BsonType.String),
                new IgnoreExtraElementsConvention(true),
                new IgnoreIfNullConvention(true)
            };

            ConventionRegistry.Register("SolarGridConventions", pack,
                type => type.Namespace == typeof(User).Namespace);

            _conventionsRegistered = true;
        }
    }
}
