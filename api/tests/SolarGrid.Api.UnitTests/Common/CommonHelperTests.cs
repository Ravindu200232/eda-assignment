/*
 * File:    CommonHelperTests.cs
 * Module:  Unit Tests
 * Owner:   Ravindu
 * Purpose: Tests for the small shared helpers: clock, paging, schedule times and passwords.
 */
using SolarGrid.Api.Common;
using SolarGrid.Api.Models;
using SolarGrid.Api.Security;
using SolarGrid.Api.UnitTests.TestSupport;

namespace SolarGrid.Api.UnitTests.Common;

public class CommonHelperTests
{
    // 10:00 in Colombo is 04:30 UTC (Sri Lanka is UTC+5:30).
    [Fact]
    public void AppClock_ToUtc_UsesSriLankaOffset()
    {
        var (clock, _) = TestClock.Create();

        var utc = clock.ToUtc(new DateOnly(2026, 9, 20), 10 * 60);

        Assert.Equal(new DateTime(2026, 9, 20, 4, 30, 0, DateTimeKind.Utc), utc);
    }

    // 20:00 UTC is already the next day in Sri Lanka.
    [Fact]
    public void AppClock_LocalToday_RollsOverBeforeUtcMidnight()
    {
        var (clock, _) = TestClock.Create(new DateTimeOffset(2026, 9, 19, 20, 0, 0, TimeSpan.Zero));

        Assert.Equal(new DateOnly(2026, 9, 20), clock.LocalToday);
    }

    // Page numbers and sizes are kept in a safe range.
    [Theory]
    [InlineData(0, 0, 1, 20)]
    [InlineData(-5, 10, 1, 10)]
    [InlineData(3, 500, 3, 100)]
    public void PagedResult_Normalize_ClampsValues(int page, int size, int expectedPage, int expectedSize)
    {
        var result = PagedResult<string>.Normalize(page, size);

        Assert.Equal((expectedPage, expectedSize), result);
    }

    // Schedule times must be exact "HH:mm" values up to 24:00.
    [Theory]
    [InlineData("00:00", 0)]
    [InlineData("06:30", 390)]
    [InlineData("24:00", 1440)]
    [InlineData("24:30", -1)]
    [InlineData("6:00", -1)]
    [InlineData("12:60", -1)]
    [InlineData("ab:cd", -1)]
    [InlineData(null, -1)]
    public void OperatingHours_ToMinutes_ParsesOnlyValidTimes(string? time, int expected)
    {
        Assert.Equal(expected, OperatingHours.ToMinutes(time));
    }

    // Passwords need 8+ characters with letters and digits.
    [Theory]
    [InlineData("Admin@123", true)]
    [InlineData("abcd1234", true)]
    [InlineData("short1", false)]
    [InlineData("lettersonly", false)]
    [InlineData("12345678", false)]
    [InlineData(null, false)]
    public void PasswordPolicy_IsStrong_ChecksLengthLettersAndDigits(string? password, bool expected)
    {
        Assert.Equal(expected, PasswordPolicy.IsStrong(password));
    }
}
