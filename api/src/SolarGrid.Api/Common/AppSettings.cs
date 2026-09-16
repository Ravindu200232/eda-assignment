/*
 * File:    AppSettings.cs
 * Module:  Common
 * Owner:   Ravindu
 * Purpose: General settings read from the "App" section of appsettings.json.
 */
namespace SolarGrid.Api.Common;

public class AppSettings
{
    public const string SectionName = "App";

    public string TimeZone { get; set; } = "Asia/Colombo";

    public bool EnableSwagger { get; set; } = true;

    public bool SeedDemoData { get; set; }

    public DefaultAdminSettings DefaultAdmin { get; set; } = new();
}

public class DefaultAdminSettings
{
    public string Nic { get; set; } = string.Empty;

    public string FullName { get; set; } = "System Administrator";

    public string Email { get; set; } = string.Empty;

    public string Phone { get; set; } = "0112000000";

    public string Password { get; set; } = string.Empty;
}
