/*
 * File:    MongoSettings.cs
 * Module:  Data Access
 * Owner:   Ravindu
 * Purpose: MongoDB connection details from the "MongoDb" section of appsettings.json.
 */
namespace SolarGrid.Api.Data;

public class MongoSettings
{
    public const string SectionName = "MongoDb";

    public string ConnectionString { get; set; } = "mongodb://localhost:27017";

    public string DatabaseName { get; set; } = "SolarGridDb";
}
