/*
 * File:    QrTokenServiceTests.cs
 * Module:  Unit Tests
 * Owner:   Hamnad
 * Purpose: Signed QR payloads can be read back, and any change to them is detected.
 */
using Microsoft.Extensions.Options;
using SolarGrid.Api.Models;
using SolarGrid.Api.Security;

namespace SolarGrid.Api.UnitTests.Security;

public class QrTokenServiceTests
{
    private const string Key = "unit-test-qr-signing-key-0123456789ab";

    // A payload has the prefix, the booking id, the nonce and a signature.
    [Fact]
    public void CreatePayload_HasFourParts()
    {
        var payload = Service().CreatePayload(ApprovedBooking());

        var parts = payload.Split('.');
        Assert.Equal(4, parts.Length);
        Assert.Equal("SSG1", parts[0]);
        Assert.Equal("6aaa95c6e007313fe4c1941a", parts[1]);
        Assert.Equal("nonce-123", parts[2]);
    }

    // Our own payload is read back and its signature checks out.
    [Fact]
    public void TryRead_OwnPayload_IsValid()
    {
        var service = Service();
        var payload = service.CreatePayload(ApprovedBooking());

        var ok = service.TryRead(payload, out var qr);

        Assert.True(ok);
        Assert.Equal("nonce-123", qr.Nonce);
        Assert.True(service.IsSignatureValid(qr, "200034501234"));
    }

    // Text that is not one of our QR codes is refused.
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("hello world")]
    [InlineData("SSG1.only.three")]
    [InlineData("ABC1.id.nonce.sig")]
    [InlineData("SSG1..nonce.sig")]
    [InlineData("SSG1.id.nonce.sig.extra")]
    public void TryRead_ForeignText_ReturnsFalse(string? text)
    {
        Assert.False(Service().TryRead(text, out _));
    }

    // Changing the nonce breaks the signature.
    [Fact]
    public void IsSignatureValid_EditedNonce_ReturnsFalse()
    {
        var service = Service();
        service.TryRead(service.CreatePayload(ApprovedBooking()), out var qr);

        Assert.False(service.IsSignatureValid(qr with { Nonce = "nonce-124" }, "200034501234"));
    }

    // The code only works for the prosumer it was issued to.
    [Fact]
    public void IsSignatureValid_OtherProsumer_ReturnsFalse()
    {
        var service = Service();
        service.TryRead(service.CreatePayload(ApprovedBooking()), out var qr);

        Assert.False(service.IsSignatureValid(qr, "995671234V"));
    }

    // A code signed with another key is not accepted.
    [Fact]
    public void IsSignatureValid_OtherKey_ReturnsFalse()
    {
        var forged = Service("attacker-key-that-is-long-enough-000000").CreatePayload(ApprovedBooking());
        var service = Service();
        service.TryRead(forged, out var qr);

        Assert.False(service.IsSignatureValid(qr, "200034501234"));
    }

    // Bookings without a nonce (not approved) cannot get a QR code.
    [Fact]
    public void CreatePayload_WithoutNonce_Throws()
    {
        var booking = ApprovedBooking();
        booking.QrNonce = null;

        Assert.Throws<InvalidOperationException>(() => Service().CreatePayload(booking));
    }

    // Nonces are URL-safe and different every time.
    [Fact]
    public void NewNonce_IsRandomAndUrlSafe()
    {
        var service = Service();
        var first = service.NewNonce();
        var second = service.NewNonce();

        Assert.NotEqual(first, second);
        Assert.Matches("^[A-Za-z0-9_-]+$", first);
    }

    // Builds the service with the given key.
    private static QrTokenService Service(string key = Key)
    {
        return new QrTokenService(Options.Create(new QrSettings { SigningKey = key }));
    }

    // An approved booking with a known nonce.
    private static EnergyReservation ApprovedBooking()
    {
        return new EnergyReservation
        {
            Id = "6aaa95c6e007313fe4c1941a",
            ProsumerNic = "200034501234",
            QrNonce = "nonce-123",
            Status = ReservationStatus.Approved
        };
    }
}
