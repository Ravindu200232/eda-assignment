/*
 * File:    UserServiceTests.cs
 * Module:  Unit Tests
 * Owner:   Ravindu
 * Purpose: Rules for creating and managing Backoffice and Grid Operator accounts.
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

public class UserServiceTests
{
    private const string AdminNic = "198512345678";
    private const string OperatorNic = "199023456789";

    private readonly IUserRepository _users = Substitute.For<IUserRepository>();
    private readonly AppClock _clock = TestClock.Create().Clock;
    private readonly UserService _service;
    private readonly CurrentUser _admin = new(AdminNic, UserRole.Backoffice);

    // Wires the service to a fake user repository.
    public UserServiceTests()
    {
        _service = new UserService(_users, TestUsers.Hasher, _clock);
    }

    // A valid request creates an active account with a hashed password.
    [Fact]
    public async Task CreateAsync_ValidRequest_SavesActiveStaffUser()
    {
        var result = await _service.CreateAsync(NewOperatorRequest());

        Assert.Equal(AccountStatus.Active, result.Status);
        Assert.Equal("sachini@solargrid.lk", result.Email);
        await _users.Received(1).InsertAsync(Arg.Is<User>(u =>
            u.Nic == "199512345678"
            && u.Role == UserRole.GridOperator
            && u.PasswordHash != "Operator123"
            && u.CreatedAt == _clock.UtcNow));
    }

    // Prosumers register themselves; they cannot be created as staff.
    [Fact]
    public async Task CreateAsync_ProsumerRole_Throws()
    {
        var request = NewOperatorRequest();
        request.Role = UserRole.Prosumer;

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.CreateAsync(request));
    }

    // NIC must be in a valid Sri Lankan format.
    [Fact]
    public async Task CreateAsync_InvalidNic_Throws()
    {
        var request = NewOperatorRequest();
        request.Nic = "12345";

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => _service.CreateAsync(request));

        Assert.Equal(NicValidator.FormatMessage, error.Message);
    }

    // Weak passwords are refused.
    [Fact]
    public async Task CreateAsync_WeakPassword_Throws()
    {
        var request = NewOperatorRequest();
        request.Password = "password";

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.CreateAsync(request));
    }

    // NIC is the primary key, so it must be unique.
    [Fact]
    public async Task CreateAsync_DuplicateNic_ThrowsConflict()
    {
        _users.GetByNicAsync("199512345678").Returns(TestUsers.Staff("199512345678", UserRole.GridOperator));

        await Assert.ThrowsAsync<ConflictException>(() => _service.CreateAsync(NewOperatorRequest()));
        await _users.DidNotReceiveWithAnyArgs().InsertAsync(default!);
    }

    // Two accounts cannot share an email address.
    [Fact]
    public async Task CreateAsync_DuplicateEmail_ThrowsConflict()
    {
        _users.EmailExistsAsync("sachini@solargrid.lk").Returns(true);

        await Assert.ThrowsAsync<ConflictException>(() => _service.CreateAsync(NewOperatorRequest()));
    }

    // Staff endpoints do not expose prosumer accounts.
    [Fact]
    public async Task GetAsync_ProsumerNic_ThrowsNotFound()
    {
        _users.GetByNicAsync("200034501234").Returns(TestUsers.Prosumer("200034501234"));

        await Assert.ThrowsAsync<NotFoundException>(() => _service.GetAsync("200034501234"));
    }

    // Listing prosumers through the staff endpoint is refused.
    [Fact]
    public async Task ListAsync_ProsumerRole_Throws()
    {
        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.ListAsync(UserRole.Prosumer, null, null, 1, 20));
    }

    // Without a role filter both staff roles are searched.
    [Fact]
    public async Task ListAsync_NoRole_SearchesBothStaffRoles()
    {
        _users.SearchAsync(default!, default, default, default, default)
            .ReturnsForAnyArgs(((IReadOnlyList<User>)new List<User> { TestUsers.Staff(OperatorNic, UserRole.GridOperator) }, 1L));

        var result = await _service.ListAsync(null, null, "nimal", 0, 0);

        Assert.Single(result.Items);
        Assert.Equal(1, result.Page);
        await _users.Received(1).SearchAsync(
            Arg.Is<IReadOnlyCollection<UserRole>>(r => r.Count == 2 && !r.Contains(UserRole.Prosumer)),
            null, "nimal", 1, PagedResult<UserResponse>.DefaultPageSize);
    }

    // An email used by someone else cannot be taken during an update.
    [Fact]
    public async Task UpdateAsync_EmailUsedByAnotherUser_ThrowsConflict()
    {
        _users.GetByNicAsync(OperatorNic).Returns(TestUsers.Staff(OperatorNic, UserRole.GridOperator));
        _users.EmailExistsAsync("taken@solargrid.lk", OperatorNic).Returns(true);

        var request = UpdateRequest(UserRole.GridOperator);
        request.Email = "Taken@SolarGrid.lk";

        await Assert.ThrowsAsync<ConflictException>(() => _service.UpdateAsync(OperatorNic, request, _admin));
    }

    // The last active Backoffice account cannot become an operator.
    [Fact]
    public async Task UpdateAsync_LastBackofficeChangedToOperator_Throws()
    {
        _users.GetByNicAsync("197812345678").Returns(TestUsers.Staff("197812345678", UserRole.Backoffice));
        _users.CountAsync(UserRole.Backoffice, AccountStatus.Active).Returns(1L);

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() =>
            _service.UpdateAsync("197812345678", UpdateRequest(UserRole.GridOperator), _admin));

        Assert.Contains("At least one active Backoffice", error.Message);
    }

    // Admins cannot remove their own Backoffice role by mistake.
    [Fact]
    public async Task UpdateAsync_RemovingOwnBackofficeRole_Throws()
    {
        _users.GetByNicAsync(AdminNic).Returns(TestUsers.Staff(AdminNic, UserRole.Backoffice));
        _users.CountAsync(UserRole.Backoffice, AccountStatus.Active).Returns(3L);

        await Assert.ThrowsAsync<BusinessRuleException>(() =>
            _service.UpdateAsync(AdminNic, UpdateRequest(UserRole.GridOperator), _admin));
    }

    // A new password in the update replaces the old hash.
    [Fact]
    public async Task UpdateAsync_WithNewPassword_ResetsPassword()
    {
        var user = TestUsers.Staff(OperatorNic, UserRole.GridOperator);
        _users.GetByNicAsync(OperatorNic).Returns(user);

        var request = UpdateRequest(UserRole.GridOperator);
        request.NewPassword = "Changed123";

        var result = await _service.UpdateAsync(OperatorNic, request, _admin);

        Assert.Equal("Updated Name", result.FullName);
        Assert.True(TestUsers.Hasher.Verify("Changed123", user.PasswordHash));
        await _users.Received(1).UpdateAsync(user);
    }

    // Staff cannot lock themselves out.
    [Fact]
    public async Task SetStatusAsync_DeactivateSelf_Throws()
    {
        _users.GetByNicAsync(AdminNic).Returns(TestUsers.Staff(AdminNic, UserRole.Backoffice));

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.SetStatusAsync(AdminNic, false, _admin));
    }

    // The last active Backoffice account cannot be deactivated.
    [Fact]
    public async Task SetStatusAsync_DeactivateLastBackoffice_Throws()
    {
        _users.GetByNicAsync("197812345678").Returns(TestUsers.Staff("197812345678", UserRole.Backoffice));
        _users.CountAsync(UserRole.Backoffice, AccountStatus.Active).Returns(1L);

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.SetStatusAsync("197812345678", false, _admin));
    }

    // Deactivating an operator saves the new status and time.
    [Fact]
    public async Task SetStatusAsync_DeactivateOperator_Saves()
    {
        var user = TestUsers.Staff(OperatorNic, UserRole.GridOperator);
        _users.GetByNicAsync(OperatorNic).Returns(user);

        var result = await _service.SetStatusAsync(OperatorNic, false, _admin);

        Assert.Equal(AccountStatus.Deactivated, result.Status);
        Assert.Equal(_clock.UtcNow, user.DeactivatedAt);
        await _users.Received(1).UpdateAsync(user);
    }

    // Reactivation records which admin did it.
    [Fact]
    public async Task SetStatusAsync_Activate_RecordsActivatingAdmin()
    {
        var user = TestUsers.Staff(OperatorNic, UserRole.GridOperator, AccountStatus.Deactivated);
        _users.GetByNicAsync(OperatorNic).Returns(user);

        var result = await _service.SetStatusAsync(OperatorNic, true, _admin);

        Assert.Equal(AccountStatus.Active, result.Status);
        Assert.Equal(AdminNic, user.ActivatedBy);
    }

    // A valid request for a new Grid Operator.
    private static CreateStaffUserRequest NewOperatorRequest()
    {
        return new CreateStaffUserRequest
        {
            Nic = "199512345678",
            FullName = "Sachini Wijesinghe",
            Email = " Sachini@SolarGrid.lk ",
            Phone = "0771112233",
            Password = "Operator123",
            Role = UserRole.GridOperator
        };
    }

    // A valid update request with the given role.
    private static UpdateStaffUserRequest UpdateRequest(UserRole role)
    {
        return new UpdateStaffUserRequest
        {
            FullName = "Updated Name",
            Email = "updated@solargrid.lk",
            Phone = "0712223344",
            Role = role
        };
    }
}
