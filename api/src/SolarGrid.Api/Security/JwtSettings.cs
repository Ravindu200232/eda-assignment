/*
 * File:    JwtSettings.cs
 * Module:  Security
 * Owner:   Ravindu
 * Purpose: Token settings from the "Jwt" section and the claim names we use.
 */
namespace SolarGrid.Api.Security;

public class JwtSettings
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "SolarGrid.Api";

    public string Audience { get; set; } = "SolarGrid.Clients";

    // At least 32 characters. Never commit the production key.
    public string Key { get; set; } = string.Empty;

    public int ExpiryHours { get; set; } = 8;
}

public static class JwtClaimNames
{
    public const string Nic = "sub";
    public const string Name = "name";
    public const string Email = "email";
    public const string Role = "role";
}
