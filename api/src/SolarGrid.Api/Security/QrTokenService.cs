/*
 * File:    QrTokenService.cs
 * Module:  Booking QR Codes
 * Owner:   Hamnad
 * Purpose: Creates and reads the text inside a booking QR code:
 *            SSG1.<reservation id>.<nonce>.<signature>
 *          The signature is an HMAC-SHA256 of the id, nonce and prosumer NIC made with a
 *          server-only key, so a QR code cannot be forged or edited. A new nonce is issued on
 *          every approval, which makes older QR codes for the same booking useless.
 */
using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Security;

public interface IQrTokenService
{
    string NewNonce();

    string CreatePayload(EnergyReservation reservation);

    bool TryRead(string? payload, out QrPayload qr);

    bool IsSignatureValid(QrPayload qr, string prosumerNic);
}

public record QrPayload(string ReservationId, string Nonce, string Signature);

// Source: API-16 (sources/api-sources.md) - HMACSHA256 and FixedTimeEquals in .NET.
public class QrTokenService : IQrTokenService
{
    public const string Prefix = "SSG1";

    private readonly byte[] _key;

    // Reads the signing key from settings.
    public QrTokenService(IOptions<QrSettings> settings)
    {
        _key = Encoding.UTF8.GetBytes(settings.Value.SigningKey);
    }

    // A new random value for an approved booking.
    public string NewNonce()
    {
        return Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(12));
    }

    // Builds the signed text that the apps show as a QR image.
    public string CreatePayload(EnergyReservation reservation)
    {
        if (string.IsNullOrEmpty(reservation.QrNonce))
            throw new InvalidOperationException("The reservation has no QR nonce.");

        var signature = Sign(reservation.Id, reservation.QrNonce, reservation.ProsumerNic);
        return string.Join('.', Prefix, reservation.Id, reservation.QrNonce, signature);
    }

    // Splits scanned text into its parts. Returns false if it is not one of our codes.
    public bool TryRead(string? payload, out QrPayload qr)
    {
        qr = new QrPayload(string.Empty, string.Empty, string.Empty);
        var parts = (payload ?? string.Empty).Trim().Split('.');

        if (parts.Length != 4 || parts[0] != Prefix || parts.Skip(1).Any(string.IsNullOrEmpty))
            return false;

        qr = new QrPayload(parts[1], parts[2], parts[3]);
        return true;
    }

    // Recomputes the signature and compares it in constant time.
    public bool IsSignatureValid(QrPayload qr, string prosumerNic)
    {
        var expected = Encoding.ASCII.GetBytes(Sign(qr.ReservationId, qr.Nonce, prosumerNic));
        var actual = Encoding.ASCII.GetBytes(qr.Signature);
        return CryptographicOperations.FixedTimeEquals(expected, actual);
    }

    // HMAC-SHA256 of the booking details, written as URL-safe Base64.
    private string Sign(string reservationId, string nonce, string prosumerNic)
    {
        var data = Encoding.UTF8.GetBytes($"{reservationId}.{nonce}.{prosumerNic}");
        return Base64Url.EncodeToString(HMACSHA256.HashData(_key, data));
    }
}
