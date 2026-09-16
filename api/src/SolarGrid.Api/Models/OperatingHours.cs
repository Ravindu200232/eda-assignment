/*
 * File:    OperatingHours.cs
 * Module:  Data Model
 * Owner:   Ravindu
 * Purpose: Opening hours of a station for one day of the week, embedded in
 *          SolarStationInfo. Times are local "HH:mm"; "24:00" means midnight.
 */
using MongoDB.Bson.Serialization.Attributes;

namespace SolarGrid.Api.Models;

public class OperatingHours
{
    public DayOfWeek Day { get; set; }

    public string OpenTime { get; set; } = "06:00";

    public string CloseTime { get; set; } = "18:00";

    [BsonIgnore]
    public int OpenMinutes => ToMinutes(OpenTime);

    [BsonIgnore]
    public int CloseMinutes => ToMinutes(CloseTime);

    // Turns "HH:mm" into minutes from midnight, or -1 when the text is not a valid time.
    public static int ToMinutes(string? time)
    {
        var parts = (time ?? string.Empty).Split(':');
        if (parts.Length != 2 || parts[0].Length != 2 || parts[1].Length != 2)
            return -1;

        if (!int.TryParse(parts[0], out var hours) || !int.TryParse(parts[1], out var minutes))
            return -1;

        var total = hours * 60 + minutes;
        var inRange = hours is >= 0 and <= 24 && minutes is >= 0 and < 60 && total <= 24 * 60;
        return inRange ? total : -1;
    }
}
