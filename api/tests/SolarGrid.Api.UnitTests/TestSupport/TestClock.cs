/*
 * File:    TestClock.cs
 * Module:  Unit Tests
 * Owner:   Ravindu
 * Purpose: A fixed, controllable clock so time-based rules give the same result every run.
 */
using Microsoft.Extensions.Time.Testing;
using SolarGrid.Api.Common;

namespace SolarGrid.Api.UnitTests.TestSupport;

// Source: API-08 (sources/api-sources.md) - FakeTimeProvider for predictable tests.
public static class TestClock
{
    // Sunday 20 Sep 2026, 10:00 in Sri Lanka (04:30 UTC).
    public static readonly DateTimeOffset DefaultStart = new(2026, 9, 20, 4, 30, 0, TimeSpan.Zero);

    // Returns an AppClock plus the fake time source that drives it.
    public static (AppClock Clock, FakeTimeProvider Time) Create(DateTimeOffset? start = null)
    {
        var time = new FakeTimeProvider(start ?? DefaultStart);
        return (new AppClock(time, "Asia/Colombo"), time);
    }
}
