/*
 * File:    ProsumerServiceTests.cs
 * Module:  Unit Tests
 * Owner:   Malith
 * Purpose: Registration, profile, activation and deactivation rules for prosumers.
 */
using NSubstitute;
using SolarGrid.Api.Common;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Models;
using SolarGrid.Api.Repositories;
using SolarGrid.Api.Security;
using SolarGrid.Api.Services;
using SolarGrid.Api.UnitTests.TestSupport;

namespace SolarGrid.Api.UnitTests.Services;

public class ProsumerServiceTests
{
    private const string ProsumerNic = "200034501234";

    private readonly IUserRepository _users = Substitute.For<IUserRepository>();
    private readonly IReservationRepository _reservations = Substitute.For<IReservationRepository>();
    private readonly AppClock _clock = TestClock.Create().Clock;
    private readonly ProsumerService _service;
    private readonly CurrentUser _admin = new("198512345678", UserRole.Backoffice);
    private readonly CurrentUser _operator = new("199023456789", UserRole.GridOperator);
    private readonly CurrentUser _prosumer = new(ProsumerNic, UserRole.Prosumer);

    // Wires the service to fake repositories.
    public ProsumerServiceTests()
    {
        _service = new ProsumerService(_users, _reservations, TestUsers.Hasher, _clock);
    }

    // A mobile sign-up is saved as a pending prosumer.
    [Fact]
    public async Task RegisterAsync_ValidRequest_SavesPendingProsumer()
    {
        var result = await _service.RegisterAsync(NewRequest());

        Assert.Equal(AccountStatus.Pending, result.Status);
        Assert.Equal(UserRole.Prosumer, result.Role);
        await _users.Received(1).InsertAsync(Arg.Is<User>(u =>
            u.Nic == ProsumerNic
            && u.Email == "kasun@home.lk"
            && u.MeterNumber == null
            && u.PasswordHash != "Prosumer123"
            && u.ActivatedAt == null));
    }

    // Old NICs are stored in upper case.
    [Fact]
    public async Task RegisterAsync_OldNicInLowerCase_IsStoredUpperCase()
    {
        var request = NewRequest();
        request.Nic = "853400937v";

        var result = await _service.RegisterAsync(request);

        Assert.Equal("853400937V", result.Nic);
    }

    // Badly formatted NICs are refused.
    [Fact]
    public async Task RegisterAsync_InvalidNic_Throws()
    {
        var request = NewRequest();
        request.Nic = "20003450123";

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => _service.RegisterAsync(request));

        Assert.Equal(NicValidator.FormatMessage, error.Message);
    }

    // A NIC used by any account (even staff) cannot register again.
    [Fact]
    public async Task RegisterAsync_NicAlreadyUsed_ThrowsConflict()
    {
        _users.GetByNicAsync(ProsumerNic).Returns(TestUsers.Staff(ProsumerNic, UserRole.GridOperator));

        await Assert.ThrowsAsync<ConflictException>(() => _service.RegisterAsync(NewRequest()));
        await _users.DidNotReceiveWithAnyArgs().InsertAsync(default!);
    }

    // Two accounts cannot share an email address.
    [Fact]
    public async Task RegisterAsync_EmailAlreadyUsed_ThrowsConflict()
    {
        _users.EmailExistsAsync("kasun@home.lk").Returns(true);

        await Assert.ThrowsAsync<ConflictException>(() => _service.RegisterAsync(NewRequest()));
    }

    // Weak passwords are refused.
    [Fact]
    public async Task RegisterAsync_WeakPassword_Throws()
    {
        var request = NewRequest();
        request.Password = "12345678";

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.RegisterAsync(request));
    }

    // Accounts made by staff are active straight away and record who made them.
    [Fact]
    public async Task CreateAsync_ByStaff_SavesActiveProsumer()
    {
        var result = await _service.CreateAsync(NewRequest(), _operator);

        Assert.Equal(AccountStatus.Active, result.Status);
        await _users.Received(1).InsertAsync(Arg.Is<User>(u =>
            u.ActivatedBy == _operator.Nic && u.ActivatedAt == _clock.UtcNow));
    }

    // Profile updates change contact details but never the NIC.
    [Fact]
    public async Task UpdateOwnProfileAsync_ValidRequest_UpdatesDetails()
    {
        var user = TestUsers.Prosumer(ProsumerNic);
        _users.GetByNicAsync(ProsumerNic).Returns(user);

        var result = await _service.UpdateOwnProfileAsync(_prosumer, UpdateRequest());

        Assert.Equal(ProsumerNic, result.Nic);
        Assert.Equal("No. 99, New Road, Malabe", result.Address);
        Assert.Equal("CEB-001", result.MeterNumber);
        Assert.Equal(_clock.UtcNow, user.UpdatedAt);
        await _users.Received(1).UpdateAsync(user);
    }

    // An email that belongs to someone else cannot be used.
    [Fact]
    public async Task UpdateOwnProfileAsync_EmailTaken_ThrowsConflict()
    {
        _users.GetByNicAsync(ProsumerNic).Returns(TestUsers.Prosumer(ProsumerNic));
        _users.EmailExistsAsync("new@home.lk", ProsumerNic).Returns(true);

        await Assert.ThrowsAsync<ConflictException>(() => _service.UpdateOwnProfileAsync(_prosumer, UpdateRequest()));
    }

    // Deactivation needs the correct password.
    [Fact]
    public async Task DeactivateOwnAccountAsync_WrongPassword_Throws()
    {
        _users.GetByNicAsync(ProsumerNic).Returns(TestUsers.Prosumer(ProsumerNic));

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() =>
            _service.DeactivateOwnAccountAsync(_prosumer, new DeactivateAccountRequest { Password = "Wrong1234" }));

        Assert.Equal("Password is incorrect.", error.Message);
    }

    // Prosumers with upcoming bookings must cancel them first.
    [Fact]
    public async Task DeactivateOwnAccountAsync_WithUpcomingReservations_Throws()
    {
        _users.GetByNicAsync(ProsumerNic).Returns(TestUsers.Prosumer(ProsumerNic));
        _reservations.HasActiveForProsumerAsync(ProsumerNic, _clock.UtcNow).Returns(true);

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() =>
            _service.DeactivateOwnAccountAsync(_prosumer, new DeactivateAccountRequest { Password = TestUsers.Password }));

        Assert.Contains("upcoming reservations", error.Message);
        await _users.DidNotReceiveWithAnyArgs().UpdateAsync(default!);
    }

    // A valid request deactivates the account.
    [Fact]
    public async Task DeactivateOwnAccountAsync_Valid_DeactivatesAccount()
    {
        var user = TestUsers.Prosumer(ProsumerNic);
        _users.GetByNicAsync(ProsumerNic).Returns(user);

        await _service.DeactivateOwnAccountAsync(_prosumer, new DeactivateAccountRequest { Password = TestUsers.Password });

        Assert.Equal(AccountStatus.Deactivated, user.Status);
        Assert.Equal(_clock.UtcNow, user.DeactivatedAt);
    }

    // Deactivating twice is reported instead of silently ignored.
    [Fact]
    public async Task DeactivateAsync_AlreadyDeactivated_Throws()
    {
        _users.GetByNicAsync(ProsumerNic).Returns(TestUsers.Prosumer(ProsumerNic, AccountStatus.Deactivated));

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.DeactivateAsync(ProsumerNic));
    }

    // Staff NICs are not visible through the prosumer endpoints.
    [Fact]
    public async Task DeactivateAsync_StaffNic_ThrowsNotFound()
    {
        _users.GetByNicAsync("199023456789").Returns(TestUsers.Staff("199023456789", UserRole.GridOperator));

        await Assert.ThrowsAsync<NotFoundException>(() => _service.DeactivateAsync("199023456789"));
    }

    // Backoffice activation turns a pending sign-up into an active account.
    [Fact]
    public async Task ActivateAsync_PendingAccount_BecomesActive()
    {
        var user = TestUsers.Prosumer(ProsumerNic, AccountStatus.Pending);
        _users.GetByNicAsync(ProsumerNic).Returns(user);

        var result = await _service.ActivateAsync(ProsumerNic, _admin);

        Assert.Equal(AccountStatus.Active, result.Status);
        Assert.Equal(_admin.Nic, user.ActivatedBy);
        Assert.Equal(_clock.UtcNow, user.ActivatedAt);
    }

    // A deactivated account can be reactivated by Backoffice.
    [Fact]
    public async Task ActivateAsync_DeactivatedAccount_IsReactivated()
    {
        var user = TestUsers.Prosumer(ProsumerNic, AccountStatus.Deactivated);
        user.DeactivatedAt = _clock.UtcNow.AddDays(-3);
        _users.GetByNicAsync(ProsumerNic).Returns(user);

        await _service.ActivateAsync(ProsumerNic, _admin);

        Assert.Equal(AccountStatus.Active, user.Status);
        Assert.Null(user.DeactivatedAt);
    }

    // Grid Operators may not reactivate accounts.
    [Fact]
    public async Task ActivateAsync_ByGridOperator_ThrowsForbidden()
    {
        _users.GetByNicAsync(ProsumerNic).Returns(TestUsers.Prosumer(ProsumerNic, AccountStatus.Deactivated));

        await Assert.ThrowsAsync<ForbiddenException>(() => _service.ActivateAsync(ProsumerNic, _operator));
    }

    // Activating an active account is reported.
    [Fact]
    public async Task ActivateAsync_AlreadyActive_Throws()
    {
        _users.GetByNicAsync(ProsumerNic).Returns(TestUsers.Prosumer(ProsumerNic));

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.ActivateAsync(ProsumerNic, _admin));
    }

    // The activation queue only asks for pending prosumers.
    [Fact]
    public async Task ListPendingActivationsAsync_ReturnsPendingProsumers()
    {
        _users.ListByStatusAsync(UserRole.Prosumer, AccountStatus.Pending)
            .Returns(new List<User> { TestUsers.Prosumer(ProsumerNic, AccountStatus.Pending) });

        var result = await _service.ListPendingActivationsAsync();

        Assert.Single(result);
        Assert.Equal(AccountStatus.Pending, result[0].Status);
    }

    // Unknown NICs give 404.
    [Fact]
    public async Task GetAsync_UnknownNic_ThrowsNotFound()
    {
        await Assert.ThrowsAsync<NotFoundException>(() => _service.GetAsync("199912345678"));
    }

    // A valid registration request.
    private static RegisterProsumerRequest NewRequest()
    {
        return new RegisterProsumerRequest
        {
            Nic = ProsumerNic,
            FullName = "Kasun Perera",
            Email = "Kasun@Home.lk",
            Phone = "0712345678",
            Password = "Prosumer123",
            Address = "No. 12, Temple Road, Malabe",
            MeterNumber = "  ",
            SolarCapacityKw = 5.5
        };
    }

    // A valid profile update request.
    private static UpdateProsumerRequest UpdateRequest()
    {
        return new UpdateProsumerRequest
        {
            FullName = "Kasun Perera",
            Email = "new@home.lk",
            Phone = "0719876543",
            Address = "No. 99, New Road, Malabe",
            MeterNumber = " CEB-001 ",
            SolarCapacityKw = 6
        };
    }
}
