/*
 * File:    CheckInServiceTests.cs
 * Module:  Unit Tests
 * Owner:   Ravindu
 * Purpose: QR verification and transfer completion rules for Grid Operators.
 *          The test clock is Sunday 20 Sep 2026, 10:00 in Sri Lanka.
 */
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using SolarGrid.Api.Common;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Models;
using SolarGrid.Api.Repositories;
using SolarGrid.Api.Security;
using SolarGrid.Api.Services;
using SolarGrid.Api.UnitTests.TestSupport;

namespace SolarGrid.Api.UnitTests.Services;

public class CheckInServiceTests
{
    private const string ProsumerNic = "200034501234";
    private const string BookingId = "6aaa95c6e007313fe4c1941a";
    private const string QrKey = "unit-test-qr-signing-key-0123456789ab";

    private readonly IReservationRepository _reservations = Substitute.For<IReservationRepository>();
    private readonly IStationRepository _stations = Substitute.For<IStationRepository>();
    private readonly IUserRepository _users = Substitute.For<IUserRepository>();
    private readonly QrTokenService _qr = QrService(QrKey);
    private readonly AppClock _clock = TestClock.Create().Clock;
    private readonly CheckInService _service;
    private readonly CurrentUser _operator = new("199023456789", UserRole.GridOperator);

    // Wires the service to fake repositories with one station and one prosumer.
    public CheckInServiceTests()
    {
        _stations.GetByIdAsync(TestStations.StationId).Returns(TestStations.Station());
        _users.GetByNicAsync(ProsumerNic).Returns(TestUsers.Prosumer(ProsumerNic));
        _reservations.ReplaceIfStatusAsync(default!, default).ReturnsForAnyArgs(true);

        _service = new CheckInService(_reservations, _stations, _users, _qr, _clock,
            NullLogger<CheckInService>.Instance);
    }

    // An approved booking starting within two hours is ready for the transfer.
    [Fact]
    public async Task VerifyAsync_ApprovedBookingInWindow_CanComplete()
    {
        var booking = GivenBooking(ReservationStatus.Approved, TimeSpan.FromHours(1));

        var result = await _service.VerifyAsync(Scan(booking), _operator);

        Assert.True(result.CanComplete);
        Assert.Equal("Valid booking. Kasun Perera can export up to 10 kWh.", result.Message);
        Assert.Equal("0771234567", result.ProsumerPhone);
        Assert.Equal(BookingId, result.Reservation.Id);
        Assert.Equal(booking.StartTime.AddHours(-2), result.CheckInOpensAt);
    }

    // Text from other QR codes is refused.
    [Fact]
    public async Task VerifyAsync_ForeignText_Throws()
    {
        var error = await Assert.ThrowsAsync<BusinessRuleException>(() =>
            _service.VerifyAsync(new VerifyQrRequest { Payload = "https://example.com" }, _operator));

        Assert.Equal("This is not a Smart Solar booking QR code.", error.Message);
    }

    // A well-formed code for a booking that does not exist gives 404.
    [Fact]
    public async Task VerifyAsync_UnknownBooking_ThrowsNotFound()
    {
        var payload = _qr.CreatePayload(Booking(ReservationStatus.Approved, TimeSpan.FromHours(1)));

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _service.VerifyAsync(new VerifyQrRequest { Payload = payload }, _operator));
    }

    // A code signed with another key is not genuine.
    [Fact]
    public async Task VerifyAsync_ForgedCode_Throws()
    {
        var booking = GivenBooking(ReservationStatus.Approved, TimeSpan.FromHours(1));
        var forged = QrService("attacker-key-that-is-long-enough-000000").CreatePayload(booking);

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() =>
            _service.VerifyAsync(new VerifyQrRequest { Payload = forged }, _operator));

        Assert.Equal("This QR code is not genuine.", error.Message);
    }

    // After a change and a new approval, the old code no longer works.
    [Fact]
    public async Task VerifyAsync_OldCodeAfterReapproval_Throws()
    {
        var booking = GivenBooking(ReservationStatus.Approved, TimeSpan.FromHours(1));
        var oldScan = Scan(booking);
        booking.QrNonce = "nonce-2";

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => _service.VerifyAsync(oldScan, _operator));

        Assert.Contains("out of date", error.Message);
    }

    // Too early: the operator is told when check-in opens (local time).
    [Fact]
    public async Task VerifyAsync_TooEarly_CannotComplete()
    {
        var booking = GivenBooking(ReservationStatus.Approved, TimeSpan.FromHours(3));

        var result = await _service.VerifyAsync(Scan(booking), _operator);

        Assert.False(result.CanComplete);
        Assert.Equal("Check-in for this booking opens at 11:00 on 20 Sep 2026.", result.Message);
    }

    // Too late: the booking ended more than an hour ago.
    [Fact]
    public async Task VerifyAsync_TooLate_CannotComplete()
    {
        var booking = GivenBooking(ReservationStatus.Approved, TimeSpan.FromHours(-4));

        var result = await _service.VerifyAsync(Scan(booking), _operator);

        Assert.False(result.CanComplete);
        Assert.Equal("The check-in time for this booking has passed.", result.Message);
    }

    // A genuine code for a finished booking shows why it cannot be used.
    [Theory]
    [InlineData(ReservationStatus.Completed, "This booking has already been completed.")]
    [InlineData(ReservationStatus.Cancelled, "This booking was cancelled.")]
    [InlineData(ReservationStatus.Pending, "This booking is waiting for approval.")]
    public async Task VerifyAsync_NotApproved_ExplainsStatus(ReservationStatus status, string message)
    {
        var booking = GivenBooking(ReservationStatus.Approved, TimeSpan.FromHours(1));
        var scan = Scan(booking);
        booking.Status = status;
        booking.QrNonce = null;

        var result = await _service.VerifyAsync(scan, _operator);

        Assert.False(result.CanComplete);
        Assert.Equal(message, result.Message);
    }

    // Prosumers cannot check bookings in.
    [Fact]
    public async Task VerifyAsync_ByProsumer_ThrowsForbidden()
    {
        var booking = GivenBooking(ReservationStatus.Approved, TimeSpan.FromHours(1));

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            _service.VerifyAsync(Scan(booking), new CurrentUser(ProsumerNic, UserRole.Prosumer)));
    }

    // Completing records the energy and makes the code unusable.
    [Fact]
    public async Task CompleteAsync_Valid_CompletesBooking()
    {
        var booking = GivenBooking(ReservationStatus.Approved, TimeSpan.FromMinutes(30));

        var result = await _service.CompleteAsync(BookingId, Complete(booking, 7.456), _operator);

        Assert.Equal(ReservationStatus.Completed, result.Status);
        Assert.Equal(7.46, result.DeliveredKwh);
        Assert.Equal(_operator.Nic, result.CompletedBy);
        Assert.Equal(_clock.UtcNow, result.CompletedAt);
        Assert.Null(booking.QrNonce);
        await _reservations.Received(1).ReplaceIfStatusAsync(booking, ReservationStatus.Approved);
    }

    // The scanned code must belong to the booking being completed.
    [Fact]
    public async Task CompleteAsync_CodeForAnotherBooking_Throws()
    {
        var booking = GivenBooking(ReservationStatus.Approved, TimeSpan.FromMinutes(30));

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() =>
            _service.CompleteAsync("6aaa95c6e007313fe4c19999", Complete(booking, 5), _operator));

        Assert.Equal("This QR code belongs to a different booking.", error.Message);
    }

    // Completing outside the check-in window is refused.
    [Fact]
    public async Task CompleteAsync_OutsideWindow_Throws()
    {
        var booking = GivenBooking(ReservationStatus.Approved, TimeSpan.FromHours(5));

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() =>
            _service.CompleteAsync(BookingId, Complete(booking, 5), _operator));

        Assert.StartsWith("Check-in for this booking opens at", error.Message);
        await _reservations.DidNotReceiveWithAnyArgs().ReplaceIfStatusAsync(default!, default);
    }

    // Delivered energy cannot exceed one bay (50 kWh at the test station).
    [Fact]
    public async Task CompleteAsync_DeliveredAboveBayCapacity_Throws()
    {
        var booking = GivenBooking(ReservationStatus.Approved, TimeSpan.FromMinutes(30));

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() =>
            _service.CompleteAsync(BookingId, Complete(booking, 50.5), _operator));

        Assert.Contains("at most 50 kWh", error.Message);
    }

    // Two operators finishing the same booking at once: only one succeeds.
    [Fact]
    public async Task CompleteAsync_ChangedAtSameTime_ThrowsConflict()
    {
        var booking = GivenBooking(ReservationStatus.Approved, TimeSpan.FromMinutes(30));
        _reservations.ReplaceIfStatusAsync(default!, default).ReturnsForAnyArgs(false);

        await Assert.ThrowsAsync<ConflictException>(() =>
            _service.CompleteAsync(BookingId, Complete(booking, 5), _operator));
    }

    // Builds the QR service with the given key.
    private static QrTokenService QrService(string key)
    {
        return new QrTokenService(Options.Create(new QrSettings { SigningKey = key }));
    }

    // A booking of the test prosumer at the test station.
    private EnergyReservation Booking(ReservationStatus status, TimeSpan startsIn)
    {
        var start = _clock.UtcNow.Add(startsIn);
        return new EnergyReservation
        {
            Id = BookingId,
            ReferenceNo = "RSV-260920-ABCDE",
            ProsumerNic = ProsumerNic,
            ProsumerName = "Kasun Perera",
            StationId = TestStations.StationId,
            StationName = "Test Microgrid",
            SlotId = TestStations.SlotId,
            StartTime = start,
            EndTime = start.AddHours(2),
            TradeType = TradeType.Export,
            EnergyKwh = 10,
            Status = status,
            QrNonce = "nonce-1"
        };
    }

    // Stores a booking in the fake repository.
    private EnergyReservation GivenBooking(ReservationStatus status, TimeSpan startsIn)
    {
        var booking = Booking(status, startsIn);
        _reservations.GetByIdAsync(BookingId).Returns(booking);
        return booking;
    }

    // What the operator app sends after scanning the booking's current code.
    private VerifyQrRequest Scan(EnergyReservation booking)
    {
        return new VerifyQrRequest { Payload = _qr.CreatePayload(booking) };
    }

    // A completion request with the booking's current code.
    private CompleteTransferRequest Complete(EnergyReservation booking, double deliveredKwh)
    {
        return new CompleteTransferRequest { Payload = _qr.CreatePayload(booking), DeliveredKwh = deliveredKwh };
    }
}
