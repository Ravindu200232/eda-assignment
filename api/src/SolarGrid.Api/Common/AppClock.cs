/*
 * File:    AppClock.cs
 * Module:  Common
 * Owner:   Ravindu
 * Purpose: Current time and Sri Lanka time conversions in one place.
 *          Times are stored in UTC; rules such as "today" use local time.
 */
namespace SolarGrid.Api.Common;

// Source: API-08 (sources/api-sources.md) - TimeProvider lets tests control the clock.
public class AppClock
{
    private readonly TimeProvider _timeProvider;
    private readonly TimeZoneInfo _zone;

    // Uses the time zone from settings, e.g. "Asia/Colombo".
    public AppClock(TimeProvider timeProvider, string timeZoneId)
    {
        _timeProvider = timeProvider;
        _zone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
    }

    public DateTime UtcNow => _timeProvider.GetUtcNow().UtcDateTime;

    public DateOnly LocalToday => DateOnly.FromDateTime(ToLocal(UtcNow));

    // Converts a stored UTC time to local time.
    public DateTime ToLocal(DateTime utc)
    {
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), _zone);
    }

    // Converts a local date and minutes-from-midnight to UTC.
    public DateTime ToUtc(DateOnly localDate, int minutesFromMidnight)
    {
        var local = localDate.ToDateTime(TimeOnly.MinValue).AddMinutes(minutesFromMidnight);
        return TimeZoneInfo.ConvertTimeToUtc(local, _zone);
    }
}
