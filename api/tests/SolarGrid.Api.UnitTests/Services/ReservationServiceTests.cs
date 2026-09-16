/*
 * File:    ReservationServiceTests.cs
 * Module:  Unit Tests
 * Owner:   Hamnad
 * Purpose: The booking rules: 7-day window, 12-hour notice, bays, overlaps,
 *          approval, rejection, QR codes and who may see what.
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

public class ReservationServiceTests
{
    private const string ProsumerNic = "200034501234";
    private const string BookingId = "6aaa95c6e007313fe4c1941a";
    private const string OtherSlotId = "6aaa95c6e007313fe4c19341";

    private readonly IReservationRepository _reservations = Substitute.For<IReservationRepository>();
    private readonly ISlotRepository _slots = Substitute.For<ISlotRepository>();
    private readonly IStationRepository _stations = Substitute.For<IStationRepository>();
    private readonly IUserRepository _users = Substitute.For<IUserRepository>();
    private readonly QrTokenService _qr = new(Options.Create(new QrSettings { SigningKey = "unit-test-qr-signing-key-0123456789ab" }));
    private readonly AppClock _clock = TestClock.Create().Clock;
    private readonly ReservationService _service;

    private readonly CurrentUser _prosumer = new(ProsumerNic, UserRole.Prosumer);
    private readonly CurrentUser _operator = new("199023456789", UserRole.GridOperator);
    private readonly SolarStation _station = TestStations.Station();
    private readonly EnergySlot _slot;

    // One active prosumer, one active station (50 kWh per bay) and an open slot tomorrow.
    public ReservationServiceTests()
    {
        _slot = TestStations.Slot(_clock.UtcNow.AddDays(1));
        _users.GetByNicAsync(ProsumerNic).Returns(TestUsers.Prosumer(ProsumerNic));
        _stations.GetByIdAsync(TestStations.StationId).Returns(_station);
        _slots.GetByIdAsync(TestStations.SlotId).Returns(_slot);
        _slots.TryTakeBayAsync(default!).ReturnsForAnyArgs(true);
        _reservations.ReplaceIfStatusAsync(default!, default).ReturnsForAnyArgs(true);

        _service = new ReservationService(_reservations, _slots, _stations, _users, _qr, _clock,
            NullLogger<ReservationService>.Instance);
    }

    // A prosumer's booking is saved as pending and takes one bay.
    [Fact]
    public async Task CreateAsync_ByProsumer_SavesPendingBooking()
    {
        var result = await _service.CreateAsync(NewBooking(), _prosumer);

        Assert.Equal(ReservationStatus.Pending, result.Status);
        Assert.Matches(@"^RSV-260920-[A-Z2-9]{5}$", result.ReferenceNo);
        Assert.Equal(_slot.StartTime, result.StartTime);
        Assert.Equal("Test Microgrid", result.StationName);
        Assert.True(result.CanModify);
        Assert.False(result.HasQrCode);
        await _slots.Received(1).TryTakeBayAsync(TestStations.SlotId);
        await _reservations.Received(1).InsertAsync(Arg.Is<EnergyReservation>(r =>
            r.ProsumerNic == ProsumerNic && r.CreatedBy == ProsumerNic && r.EnergyKwh == 10));
    }

    // Prosumers cannot book in someone else's name.
    [Fact]
    public async Task CreateAsync_ProsumerForSomeoneElse_ThrowsForbidden()
    {
        var request = NewBooking();
        request.ProsumerNic = "995671234V";

        await Assert.ThrowsAsync<ForbiddenException>(() => _service.CreateAsync(request, _prosumer));
    }

    // Staff must choose the prosumer.
    [Fact]
    public async Task CreateAsync_StaffWithoutProsumer_Throws()
    {
        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => _service.CreateAsync(NewBooking(), _operator));

        Assert.Equal("Select the prosumer for this booking.", error.Message);
    }

    // Staff can book for a prosumer; the booking records who made it.
    [Fact]
    public async Task CreateAsync_StaffForProsumer_RecordsStaffAsCreator()
    {
        var request = NewBooking();
        request.ProsumerNic = ProsumerNic;

        var result = await _service.CreateAsync(request, _operator);

        Assert.Equal(ProsumerNic, result.ProsumerNic);
        Assert.Equal(_operator.Nic, result.CreatedBy);
    }

    // Pending or deactivated prosumers cannot book.
    [Fact]
    public async Task CreateAsync_InactiveProsumer_Throws()
    {
        _users.GetByNicAsync(ProsumerNic).Returns(TestUsers.Prosumer(ProsumerNic, AccountStatus.Pending));

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.CreateAsync(NewBooking(), _prosumer));
    }

    // A slot that has started cannot be booked.
    [Fact]
    public async Task CreateAsync_SlotAlreadyStarted_Throws()
    {
        _slot.StartTime = _clock.UtcNow.AddMinutes(-1);

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => _service.CreateAsync(NewBooking(), _prosumer));

        Assert.Contains("already started", error.Message);
    }

    // Exactly 7 days ahead is still allowed.
    [Fact]
    public async Task CreateAsync_ExactlySevenDaysAhead_IsAllowed()
    {
        _slot.StartTime = _clock.UtcNow.AddDays(7);

        var result = await _service.CreateAsync(NewBooking(), _prosumer);

        Assert.Equal(ReservationStatus.Pending, result.Status);
    }

    // One minute past the 7-day window is refused.
    [Fact]
    public async Task CreateAsync_MoreThanSevenDaysAhead_Throws()
    {
        _slot.StartTime = _clock.UtcNow.AddDays(7).AddMinutes(1);

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => _service.CreateAsync(NewBooking(), _prosumer));

        Assert.Equal("Bookings can only be made up to 7 days in advance.", error.Message);
        await _slots.DidNotReceiveWithAnyArgs().TryTakeBayAsync(default!);
    }

    // Closed slots and inactive stations take no bookings.
    [Fact]
    public async Task CreateAsync_ClosedSlotOrInactiveStation_Throws()
    {
        _slot.IsOpen = false;
        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.CreateAsync(NewBooking(), _prosumer));

        _slot.IsOpen = true;
        _station.Status = StationStatus.Inactive;
        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.CreateAsync(NewBooking(), _prosumer));
    }

    // Energy is limited to one bay (400 kWh / 8 bays = 50 kWh).
    [Fact]
    public async Task CreateAsync_EnergyAboveBayCapacity_Throws()
    {
        var request = NewBooking();
        request.EnergyKwh = 50.5;

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => _service.CreateAsync(request, _prosumer));

        Assert.Contains("at most 50 kWh", error.Message);
    }

    // A prosumer cannot hold two bookings at the same time.
    [Fact]
    public async Task CreateAsync_OverlappingBooking_ThrowsConflict()
    {
        _reservations.HasOverlapForProsumerAsync(ProsumerNic, _slot.StartTime, _slot.EndTime).Returns(true);

        var error = await Assert.ThrowsAsync<ConflictException>(() => _service.CreateAsync(NewBooking(), _prosumer));

        Assert.Equal("You already have a booking at this time.", error.Message);
    }

    // If the last bay is taken first, the booking fails cleanly.
    [Fact]
    public async Task CreateAsync_NoBayLeft_ThrowsConflict()
    {
        _slots.TryTakeBayAsync(TestStations.SlotId).Returns(false);

        await Assert.ThrowsAsync<ConflictException>(() => _service.CreateAsync(NewBooking(), _prosumer));
        await _reservations.DidNotReceiveWithAnyArgs().InsertAsync(default!);
    }

    // A failed save gives the bay back.
    [Fact]
    public async Task CreateAsync_SaveFails_ReleasesBay()
    {
        _reservations.InsertAsync(default!).ReturnsForAnyArgs(Task.FromException(new InvalidOperationException("db down")));

        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreateAsync(NewBooking(), _prosumer));
        await _slots.Received(1).ReleaseBayAsync(TestStations.SlotId);
    }

    // Changes need at least 12 hours' notice.
    [Fact]
    public async Task UpdateAsync_LessThanTwelveHours_Throws()
    {
        GivenBooking(ReservationStatus.Pending, TimeSpan.FromHours(12) - TimeSpan.FromMinutes(1));

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => _service.UpdateAsync(BookingId, SameSlotChange(), _prosumer));

        Assert.Equal("Bookings can only be changed at least 12 hours before the start time.", error.Message);
    }

    // Exactly 12 hours' notice is enough.
    [Fact]
    public async Task UpdateAsync_ExactlyTwelveHours_IsAllowed()
    {
        GivenBooking(ReservationStatus.Pending, TimeSpan.FromHours(12));

        var result = await _service.UpdateAsync(BookingId, SameSlotChange(), _prosumer);

        Assert.Equal(20, result.EnergyKwh);
        Assert.Equal(TradeType.Import, result.TradeType);
        Assert.True(result.CanModify);
    }

    // Changing an approved booking sends it back for approval and removes its QR code.
    [Fact]
    public async Task UpdateAsync_ApprovedBooking_ReturnsToPending()
    {
        var booking = GivenBooking(ReservationStatus.Approved, TimeSpan.FromDays(2));

        var result = await _service.UpdateAsync(BookingId, SameSlotChange(), _prosumer);

        Assert.Equal(ReservationStatus.Pending, result.Status);
        Assert.False(result.HasQrCode);
        Assert.Null(booking.QrNonce);
        Assert.Null(booking.ApprovedBy);
        await _reservations.Received(1).ReplaceIfStatusAsync(booking, ReservationStatus.Approved);
    }

    // Moving to another slot takes the new bay and frees the old one.
    [Fact]
    public async Task UpdateAsync_MoveSlot_SwapsBays()
    {
        GivenBooking(ReservationStatus.Pending, TimeSpan.FromDays(2));
        var newSlot = TestStations.Slot(_clock.UtcNow.AddDays(3));
        newSlot.Id = OtherSlotId;
        _slots.GetByIdAsync(OtherSlotId).Returns(newSlot);

        var result = await _service.UpdateAsync(BookingId, MoveTo(OtherSlotId), _prosumer);

        Assert.Equal(OtherSlotId, result.SlotId);
        Assert.Equal(newSlot.StartTime, result.StartTime);
        await _slots.Received(1).TryTakeBayAsync(OtherSlotId);
        await _slots.Received(1).ReleaseBayAsync(TestStations.SlotId);
    }

    // If the new slot is full, the booking keeps its old bay.
    [Fact]
    public async Task UpdateAsync_MoveToFullSlot_KeepsOldBay()
    {
        GivenBooking(ReservationStatus.Pending, TimeSpan.FromDays(2));
        var newSlot = TestStations.Slot(_clock.UtcNow.AddDays(3));
        newSlot.Id = OtherSlotId;
        _slots.GetByIdAsync(OtherSlotId).Returns(newSlot);
        _slots.TryTakeBayAsync(OtherSlotId).Returns(false);

        await Assert.ThrowsAsync<ConflictException>(() => _service.UpdateAsync(BookingId, MoveTo(OtherSlotId), _prosumer));
        await _slots.DidNotReceiveWithAnyArgs().ReleaseBayAsync(default!);
    }

    // The new slot must also be inside the 7-day window.
    [Fact]
    public async Task UpdateAsync_NewSlotTooFarAhead_Throws()
    {
        GivenBooking(ReservationStatus.Pending, TimeSpan.FromDays(2));
        var newSlot = TestStations.Slot(_clock.UtcNow.AddDays(8));
        newSlot.Id = OtherSlotId;
        _slots.GetByIdAsync(OtherSlotId).Returns(newSlot);

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.UpdateAsync(BookingId, MoveTo(OtherSlotId), _prosumer));
    }

    // Finished bookings cannot be changed.
    [Fact]
    public async Task UpdateAsync_CancelledBooking_Throws()
    {
        GivenBooking(ReservationStatus.Cancelled, TimeSpan.FromDays(2));

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => _service.UpdateAsync(BookingId, SameSlotChange(), _prosumer));

        Assert.Equal("Only pending or approved bookings can be changed.", error.Message);
    }

    // Other people's bookings look like missing ones.
    [Fact]
    public async Task UpdateAsync_OtherProsumersBooking_ThrowsNotFound()
    {
        GivenBooking(ReservationStatus.Pending, TimeSpan.FromDays(2));

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _service.UpdateAsync(BookingId, SameSlotChange(), new CurrentUser("995671234V", UserRole.Prosumer)));
    }

    // Cancelling needs at least 12 hours' notice.
    [Fact]
    public async Task CancelAsync_LessThanTwelveHours_Throws()
    {
        GivenBooking(ReservationStatus.Approved, TimeSpan.FromHours(3));

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => _service.CancelAsync(BookingId, null, _prosumer));

        Assert.Equal("Bookings can only be cancelled at least 12 hours before the start time.", error.Message);
        await _slots.DidNotReceiveWithAnyArgs().ReleaseBayAsync(default!);
    }

    // A valid cancellation frees the bay and keeps the reason.
    [Fact]
    public async Task CancelAsync_Valid_FreesBay()
    {
        var booking = GivenBooking(ReservationStatus.Approved, TimeSpan.FromDays(1));

        var result = await _service.CancelAsync(BookingId, new CancelReservationRequest { Reason = " Plans changed " }, _operator);

        Assert.Equal(ReservationStatus.Cancelled, result.Status);
        Assert.Equal("Plans changed", result.Reason);
        Assert.Equal(_operator.Nic, result.CancelledBy);
        Assert.Null(booking.QrNonce);
        await _slots.Received(1).ReleaseBayAsync(TestStations.SlotId);
    }

    // Completed bookings cannot be cancelled.
    [Fact]
    public async Task CancelAsync_CompletedBooking_Throws()
    {
        GivenBooking(ReservationStatus.Completed, TimeSpan.FromDays(1));

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.CancelAsync(BookingId, null, _prosumer));
    }

    // If someone else changed the booking first, nothing is overwritten.
    [Fact]
    public async Task CancelAsync_ChangedByOthers_ThrowsConflict()
    {
        GivenBooking(ReservationStatus.Pending, TimeSpan.FromDays(1));
        _reservations.ReplaceIfStatusAsync(default!, default).ReturnsForAnyArgs(false);

        await Assert.ThrowsAsync<ConflictException>(() => _service.CancelAsync(BookingId, null, _prosumer));
        await _slots.DidNotReceiveWithAnyArgs().ReleaseBayAsync(default!);
    }

    // Approval issues a QR code that the service can read back.
    [Fact]
    public async Task ApproveAsync_PendingBooking_IssuesQrCode()
    {
        var booking = GivenBooking(ReservationStatus.Pending, TimeSpan.FromDays(1));

        var result = await _service.ApproveAsync(BookingId, _operator);
        var qr = await _service.GetQrCodeAsync(BookingId, _prosumer);

        Assert.Equal(ReservationStatus.Approved, result.Status);
        Assert.True(result.HasQrCode);
        Assert.Equal(_operator.Nic, booking.ApprovedBy);
        Assert.True(_qr.TryRead(qr.Payload, out var parsed));
        Assert.True(_qr.IsSignatureValid(parsed, ProsumerNic));
        Assert.Equal(booking.QrNonce, parsed.Nonce);
    }

    // Only pending bookings can be approved.
    [Fact]
    public async Task ApproveAsync_NotPending_Throws()
    {
        GivenBooking(ReservationStatus.Cancelled, TimeSpan.FromDays(1));

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.ApproveAsync(BookingId, _operator));
    }

    // A booking whose time has passed cannot be approved.
    [Fact]
    public async Task ApproveAsync_StartPassed_Throws()
    {
        GivenBooking(ReservationStatus.Pending, TimeSpan.FromMinutes(-5));

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.ApproveAsync(BookingId, _operator));
    }

    // Prosumers cannot approve bookings.
    [Fact]
    public async Task ApproveAsync_ByProsumer_ThrowsForbidden()
    {
        GivenBooking(ReservationStatus.Pending, TimeSpan.FromDays(1));

        await Assert.ThrowsAsync<ForbiddenException>(() => _service.ApproveAsync(BookingId, _prosumer));
    }

    // Rejection keeps the reason and frees the bay, at any time before approval.
    [Fact]
    public async Task RejectAsync_PendingBooking_FreesBay()
    {
        GivenBooking(ReservationStatus.Pending, TimeSpan.FromHours(2));

        var result = await _service.RejectAsync(BookingId, new RejectReservationRequest { Reason = "Maintenance" }, _operator);

        Assert.Equal(ReservationStatus.Rejected, result.Status);
        Assert.Equal("Maintenance", result.Reason);
        Assert.Equal(_operator.Nic, result.RejectedBy);
        await _slots.Received(1).ReleaseBayAsync(TestStations.SlotId);
    }

    // Approved bookings cannot be rejected.
    [Fact]
    public async Task RejectAsync_ApprovedBooking_Throws()
    {
        GivenBooking(ReservationStatus.Approved, TimeSpan.FromDays(1));

        await Assert.ThrowsAsync<BusinessRuleException>(() =>
            _service.RejectAsync(BookingId, new RejectReservationRequest { Reason = "No" }, _operator));
    }

    // Pending bookings have no QR code yet.
    [Fact]
    public async Task GetQrCodeAsync_PendingBooking_Throws()
    {
        GivenBooking(ReservationStatus.Pending, TimeSpan.FromDays(1));

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => _service.GetQrCodeAsync(BookingId, _prosumer));

        Assert.Equal("A QR code is only available for approved bookings.", error.Message);
    }

    // The 12-hour flag tells the apps when to hide the change buttons.
    [Fact]
    public async Task GetAsync_SetsCanModifyFromTheTwelveHourRule()
    {
        GivenBooking(ReservationStatus.Approved, TimeSpan.FromHours(11));

        var result = await _service.GetAsync(BookingId, _prosumer);

        Assert.False(result.CanModify);
        Assert.Equal(result.StartTime.AddHours(-12), result.ModifyDeadline);
    }

    // A booking whose time has ended is flagged as past; a future one is not.
    [Fact]
    public async Task GetAsync_SetsIsPastFromTheEndTime()
    {
        GivenBooking(ReservationStatus.Approved, TimeSpan.FromHours(-3));
        var ended = await _service.GetAsync(BookingId, _prosumer);

        GivenBooking(ReservationStatus.Approved, TimeSpan.FromHours(3));
        var upcoming = await _service.GetAsync(BookingId, _prosumer);

        Assert.True(ended.IsPast);
        Assert.False(ended.CanModify);
        Assert.False(upcoming.IsPast);
    }

    // Prosumers always get their own bookings, whatever NIC they ask for.
    [Fact]
    public async Task ListAsync_Prosumer_IsLimitedToOwnBookings()
    {
        var filter = CaptureFilter();

        await _service.ListAsync(new ReservationQuery { Nic = "995671234V" }, _prosumer);

        Assert.Equal(ProsumerNic, filter().ProsumerNic);
    }

    // The history list asks for finished or past bookings, newest first.
    [Fact]
    public async Task ListAsync_HistoryScope_UsesHistoryFilter()
    {
        var filter = CaptureFilter();

        await _service.ListAsync(new ReservationQuery { Scope = ReservationScope.History }, _operator);

        Assert.Equal(_clock.UtcNow, filter().HistoryAtUtc);
        Assert.True(filter().NewestFirst);
        Assert.Null(filter().ProsumerNic);
    }

    // The current list shows approved bookings that have not ended, soonest first.
    [Fact]
    public async Task ListAsync_CurrentScope_ShowsLiveApprovedBookings()
    {
        var filter = CaptureFilter();

        await _service.ListAsync(new ReservationQuery { Scope = ReservationScope.Current, Nic = "853400937v" }, _operator);

        Assert.Equal(new[] { ReservationStatus.Approved }, filter().Statuses);
        Assert.Equal(_clock.UtcNow, filter().EndsAfterUtc);
        Assert.False(filter().NewestFirst);
        Assert.Equal("853400937V", filter().ProsumerNic);
    }

    // A status that does not fit the chosen list returns nothing without asking the database.
    [Fact]
    public async Task ListAsync_ConflictingScopeAndStatus_ReturnsEmpty()
    {
        var result = await _service.ListAsync(
            new ReservationQuery { Scope = ReservationScope.Pending, Status = ReservationStatus.Completed }, _operator);

        Assert.Empty(result.Items);
        await _reservations.DidNotReceiveWithAnyArgs().SearchAsync(default!, default, default);
    }

    // Local date filters become UTC ranges (Sri Lanka midnight to midnight).
    [Fact]
    public async Task ListAsync_DateRange_UsesLocalMidnight()
    {
        var filter = CaptureFilter();

        await _service.ListAsync(new ReservationQuery { From = new DateOnly(2026, 9, 21), To = new DateOnly(2026, 9, 21) }, _operator);

        Assert.Equal(new DateTime(2026, 9, 20, 18, 30, 0, DateTimeKind.Utc), filter().StartFromUtc);
        Assert.Equal(new DateTime(2026, 9, 21, 18, 30, 0, DateTimeKind.Utc), filter().StartBeforeUtc);
    }

    // A booking request for tomorrow's test slot.
    private static CreateReservationRequest NewBooking()
    {
        return new CreateReservationRequest { SlotId = TestStations.SlotId, EnergyKwh = 10, TradeType = TradeType.Export };
    }

    // Same slot, more energy and the other trade type.
    private static UpdateReservationRequest SameSlotChange()
    {
        return new UpdateReservationRequest { SlotId = TestStations.SlotId, EnergyKwh = 20, TradeType = TradeType.Import };
    }

    // Moves the booking to another slot.
    private static UpdateReservationRequest MoveTo(string slotId)
    {
        return new UpdateReservationRequest { SlotId = slotId, EnergyKwh = 10, TradeType = TradeType.Export };
    }

    // Stores a booking of the test prosumer in the fake repository.
    private EnergyReservation GivenBooking(ReservationStatus status, TimeSpan startsIn)
    {
        var start = _clock.UtcNow.Add(startsIn);
        var booking = new EnergyReservation
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
            QrNonce = status == ReservationStatus.Approved ? "old-nonce" : null,
            ApprovedBy = status == ReservationStatus.Approved ? _operator.Nic : null
        };

        _reservations.GetByIdAsync(BookingId).Returns(booking);
        return booking;
    }

    // Records the filter the service sends to the repository.
    private Func<ReservationFilter> CaptureFilter()
    {
        ReservationFilter? captured = null;
        _reservations.SearchAsync(Arg.Do<ReservationFilter>(f => captured = f), Arg.Any<int>(), Arg.Any<int>())
            .Returns(((IReadOnlyList<EnergyReservation>)new List<EnergyReservation>(), 0L));
        return () => captured ?? throw new InvalidOperationException("SearchAsync was not called.");
    }
}
