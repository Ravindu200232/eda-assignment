/*
 * File:    NicValidator.cs
 * Module:  Common
 * Owner:   Ravindu
 * Purpose: Checks Sri Lankan NIC numbers. NIC is the primary key of every user.
 */
using System.Text.RegularExpressions;

namespace SolarGrid.Api.Common;

// Source: API-09 (sources/api-sources.md) - old and new NIC number formats.
public static class NicValidator
{
    public const string FormatMessage = "NIC must be 9 digits followed by V or X, or 12 digits.";

    private static readonly Regex OldFormat = new(@"^\d{9}[VX]$");
    private static readonly Regex NewFormat = new(@"^\d{12}$");

    // Trims and upper-cases a NIC so "853400937v" and "853400937V" are the same key.
    public static string Normalize(string? nic)
    {
        return (nic ?? string.Empty).Trim().ToUpperInvariant();
    }

    // True when the NIC has a valid format and a valid birth-day number.
    public static bool IsValid(string? nic)
    {
        var value = Normalize(nic);
        string dayDigits;

        if (OldFormat.IsMatch(value))
            dayDigits = value.Substring(2, 3);
        else if (NewFormat.IsMatch(value))
            dayDigits = value.Substring(4, 3);
        else
            return false;

        // Women's NICs add 500 to the day of the year.
        var day = int.Parse(dayDigits);
        if (day > 500)
            day -= 500;

        return day is >= 1 and <= 366;
    }
}
