/*
 * File:    SolarStation.cs
 * Module:  Data Model
 * Owner:   Ravindu
 * Purpose: A document in the "SolarStationInfo" collection - one microgrid
 *          node with its GPS location, capacity, battery slots and schedule.
 */
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver.GeoJsonObjectModel;

namespace SolarGrid.Api.Models;

public class SolarStation
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    // Stored as GeoJSON so MongoDB can search by distance.
    public GeoJsonPoint<GeoJson2DGeographicCoordinates> Location { get; set; } = null!;

    public double SolarCapacityKw { get; set; }

    public double StorageCapacityKwh { get; set; }

    public int TotalBatterySlots { get; set; }

    public int AvailableBatterySlots { get; set; }

    public List<OperatingHours> Schedule { get; set; } = new();

    public StationStatus Status { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    [BsonIgnore]
    public double Latitude => Location.Coordinates.Latitude;

    [BsonIgnore]
    public double Longitude => Location.Coordinates.Longitude;

    // Energy that one battery slot can hold.
    public double BayCapacityKwh()
    {
        return TotalBatterySlots == 0 ? 0 : Math.Round(StorageCapacityKwh / TotalBatterySlots, 2);
    }

    // Builds a GeoJSON point from latitude and longitude.
    public static GeoJsonPoint<GeoJson2DGeographicCoordinates> ToPoint(double latitude, double longitude)
    {
        return new GeoJsonPoint<GeoJson2DGeographicCoordinates>(
            new GeoJson2DGeographicCoordinates(longitude, latitude));
    }
}
