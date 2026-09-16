/*
 * File:    QrSettings.cs
 * Module:  Security
 * Owner:   Hamnad
 * Purpose: Secret key used to sign booking QR codes (the "Qr" section of appsettings).
 */
namespace SolarGrid.Api.Security;

public class QrSettings
{
    public const string SectionName = "Qr";

    // At least 32 characters. Never commit the production key.
    public string SigningKey { get; set; } = string.Empty;
}
