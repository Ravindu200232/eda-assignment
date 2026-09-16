/*
 * File:    ProsumerService.cs
 * Module:  Prosumer Accounts
 * Owner:   Malith
 * Purpose: Business rules for prosumer accounts:
 *          - the NIC is the primary key and must be valid and unique
 *          - mobile sign-ups wait for Backoffice activation
 *          - only Backoffice can activate or reactivate an account
 *          - accounts with upcoming bookings cannot be deactivated
 */
using SolarGrid.Api.Common;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Models;
using SolarGrid.Api.Repositories;
using SolarGrid.Api.Security;

namespace SolarGrid.Api.Services;

public class ProsumerService : IProsumerService
{
    private static readonly UserRole[] ProsumerRole = { UserRole.Prosumer };

    private readonly IUserRepository _users;
    private readonly IReservationRepository _reservations;
    private readonly IPasswordHasher _hasher;
    private readonly AppClock _clock;

    // Needs the user and reservation stores, the password hasher and the clock.
    public ProsumerService(IUserRepository users, IReservationRepository reservations, IPasswordHasher hasher, AppClock clock)
    {
        _users = users;
        _reservations = reservations;
        _hasher = hasher;
        _clock = clock;
    }

    // Self sign-up from the mobile app. The account waits for Backoffice activation.
    public async Task<UserResponse> RegisterAsync(RegisterProsumerRequest request)
    {
        var user = await BuildNewProsumerAsync(request, AccountStatus.Pending);
        await _users.InsertAsync(user);
        return user.ToResponse();
    }

    // Staff create an account for a prosumer. It is active straight away.
    public async Task<UserResponse> CreateAsync(RegisterProsumerRequest request, CurrentUser actor)
    {
        var user = await BuildNewProsumerAsync(request, AccountStatus.Active);
        user.ActivatedAt = user.CreatedAt;
        user.ActivatedBy = actor.Nic;

        await _users.InsertAsync(user);
        return user.ToResponse();
    }

    // The signed-in prosumer's own profile.
    public async Task<UserResponse> GetOwnProfileAsync(CurrentUser caller)
    {
        var user = await GetProsumerAsync(caller.Nic);
        return user.ToResponse();
    }

    // The prosumer edits their own details. The NIC cannot change.
    public async Task<UserResponse> UpdateOwnProfileAsync(CurrentUser caller, UpdateProsumerRequest request)
    {
        var user = await GetProsumerAsync(caller.Nic);
        await ApplyChangesAsync(user, request);
        return user.ToResponse();
    }

    // The prosumer closes their account after confirming the password.
    public async Task DeactivateOwnAccountAsync(CurrentUser caller, DeactivateAccountRequest request)
    {
        var user = await GetProsumerAsync(caller.Nic);

        if (!_hasher.Verify(request.Password, user.PasswordHash))
            throw new BusinessRuleException("Password is incorrect.");

        await DeactivateUserAsync(user);
    }

    // Lists prosumers for staff, with optional status and search filters.
    public async Task<PagedResult<UserResponse>> ListAsync(AccountStatus? status, string? search, int page, int pageSize)
    {
        (page, pageSize) = PagedResult<UserResponse>.Normalize(page, pageSize);
        var (items, total) = await _users.SearchAsync(ProsumerRole, status, search, page, pageSize);
        return new PagedResult<UserResponse>(items.Select(u => u.ToResponse()).ToList(), total, page, pageSize);
    }

    // New sign-ups waiting for activation, oldest first.
    public async Task<IReadOnlyList<UserResponse>> ListPendingActivationsAsync()
    {
        var pending = await _users.ListByStatusAsync(UserRole.Prosumer, AccountStatus.Pending);
        return pending.Select(u => u.ToResponse()).ToList();
    }

    // One prosumer for staff screens.
    public async Task<UserResponse> GetAsync(string nic)
    {
        var user = await GetProsumerAsync(nic);
        return user.ToResponse();
    }

    // Staff edit a prosumer's details.
    public async Task<UserResponse> UpdateAsync(string nic, UpdateProsumerRequest request)
    {
        var user = await GetProsumerAsync(nic);
        await ApplyChangesAsync(user, request);
        return user.ToResponse();
    }

    // Staff deactivate a prosumer (this also rejects a pending sign-up).
    public async Task<UserResponse> DeactivateAsync(string nic)
    {
        var user = await GetProsumerAsync(nic);
        await DeactivateUserAsync(user);
        return user.ToResponse();
    }

    // Backoffice activates a new sign-up or reactivates a deactivated account.
    public async Task<UserResponse> ActivateAsync(string nic, CurrentUser actor)
    {
        if (!actor.IsBackoffice)
            throw new ForbiddenException("Only a Backoffice officer can activate prosumer accounts.");

        var user = await GetProsumerAsync(nic);
        if (user.Status == AccountStatus.Active)
            throw new BusinessRuleException("This account is already active.");

        var now = _clock.UtcNow;
        user.Status = AccountStatus.Active;
        user.ActivatedAt = now;
        user.ActivatedBy = actor.Nic;
        user.DeactivatedAt = null;
        user.UpdatedAt = now;

        await _users.UpdateAsync(user);
        return user.ToResponse();
    }

    // Checks NIC, password and uniqueness, then builds the new document.
    private async Task<User> BuildNewProsumerAsync(RegisterProsumerRequest request, AccountStatus status)
    {
        var nic = NicValidator.Normalize(request.Nic);
        if (!NicValidator.IsValid(nic))
            throw new BusinessRuleException(NicValidator.FormatMessage);

        PasswordPolicy.Ensure(request.Password);

        if (await _users.GetByNicAsync(nic) != null)
            throw new ConflictException("An account with this NIC already exists.");

        var email = NormalizeEmail(request.Email);
        if (await _users.EmailExistsAsync(email))
            throw new ConflictException("This email address is already in use.");

        var now = _clock.UtcNow;
        return new User
        {
            Nic = nic,
            FullName = request.FullName.Trim(),
            Email = email,
            Phone = request.Phone.Trim(),
            PasswordHash = _hasher.Hash(request.Password),
            Role = UserRole.Prosumer,
            Status = status,
            Address = request.Address.Trim(),
            MeterNumber = TrimOrNull(request.MeterNumber),
            SolarCapacityKw = request.SolarCapacityKw,
            CreatedAt = now,
            UpdatedAt = now
        };
    }

    // Copies editable fields after checking the email is still unique.
    private async Task ApplyChangesAsync(User user, UpdateProsumerRequest request)
    {
        var email = NormalizeEmail(request.Email);
        if (await _users.EmailExistsAsync(email, user.Nic))
            throw new ConflictException("This email address is already in use.");

        user.FullName = request.FullName.Trim();
        user.Email = email;
        user.Phone = request.Phone.Trim();
        user.Address = request.Address.Trim();
        user.MeterNumber = TrimOrNull(request.MeterNumber);
        user.SolarCapacityKw = request.SolarCapacityKw;
        user.UpdatedAt = _clock.UtcNow;

        await _users.UpdateAsync(user);
    }

    // Deactivation is blocked while the prosumer still has bookings to attend.
    private async Task DeactivateUserAsync(User user)
    {
        if (user.Status == AccountStatus.Deactivated)
            throw new BusinessRuleException("This account is already deactivated.");

        var now = _clock.UtcNow;
        if (await _reservations.HasActiveForProsumerAsync(user.Nic, now))
            throw new BusinessRuleException("This account has upcoming reservations. Cancel them before deactivating.");

        user.Status = AccountStatus.Deactivated;
        user.DeactivatedAt = now;
        user.UpdatedAt = now;
        await _users.UpdateAsync(user);
    }

    // Loads a user and makes sure it is a prosumer.
    private async Task<User> GetProsumerAsync(string nic)
    {
        var user = await _users.GetByNicAsync(NicValidator.Normalize(nic));
        if (user == null || user.Role != UserRole.Prosumer)
            throw new NotFoundException("Prosumer not found.");

        return user;
    }

    // Emails are compared in lower case.
    private static string NormalizeEmail(string email)
    {
        return email.Trim().ToLowerInvariant();
    }

    // Empty optional text is stored as null.
    private static string? TrimOrNull(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
