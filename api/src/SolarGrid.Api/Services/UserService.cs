/*
 * File:    UserService.cs
 * Module:  Staff Users
 * Owner:   Ravindu
 * Purpose: Business rules for Backoffice and Grid Operator accounts.
 *          Prosumer accounts are handled by ProsumerService.
 */
using SolarGrid.Api.Common;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Models;
using SolarGrid.Api.Repositories;
using SolarGrid.Api.Security;

namespace SolarGrid.Api.Services;

public class UserService : IUserService
{
    private static readonly UserRole[] StaffRoles = { UserRole.Backoffice, UserRole.GridOperator };

    private readonly IUserRepository _users;
    private readonly IPasswordHasher _hasher;
    private readonly AppClock _clock;

    // Needs the user store, password hasher and clock.
    public UserService(IUserRepository users, IPasswordHasher hasher, AppClock clock)
    {
        _users = users;
        _hasher = hasher;
        _clock = clock;
    }

    // Lists staff accounts with optional role, status and search filters.
    public async Task<PagedResult<UserResponse>> ListAsync(UserRole? role, AccountStatus? status, string? search, int page, int pageSize)
    {
        if (role == UserRole.Prosumer)
            throw new BusinessRuleException("Prosumers are listed from the prosumer management page.");

        var roles = role.HasValue ? new[] { role.Value } : StaffRoles;
        (page, pageSize) = PagedResult<UserResponse>.Normalize(page, pageSize);

        var (items, total) = await _users.SearchAsync(roles, status, search, page, pageSize);
        return new PagedResult<UserResponse>(items.Select(u => u.ToResponse()).ToList(), total, page, pageSize);
    }

    // Returns one staff account.
    public async Task<UserResponse> GetAsync(string nic)
    {
        var user = await GetStaffUserAsync(nic);
        return user.ToResponse();
    }

    // Creates an active staff account after checking NIC, email, role and password.
    public async Task<UserResponse> CreateAsync(CreateStaffUserRequest request)
    {
        var nic = NicValidator.Normalize(request.Nic);
        if (!NicValidator.IsValid(nic))
            throw new BusinessRuleException(NicValidator.FormatMessage);

        var role = EnsureStaffRole(request.Role);
        PasswordPolicy.Ensure(request.Password);

        var email = NormalizeEmail(request.Email);
        if (await _users.GetByNicAsync(nic) != null)
            throw new ConflictException("A user with this NIC already exists.");

        if (await _users.EmailExistsAsync(email))
            throw new ConflictException("This email address is already in use.");

        var now = _clock.UtcNow;
        var user = new User
        {
            Nic = nic,
            FullName = request.FullName.Trim(),
            Email = email,
            Phone = request.Phone.Trim(),
            PasswordHash = _hasher.Hash(request.Password),
            Role = role,
            Status = AccountStatus.Active,
            CreatedAt = now,
            UpdatedAt = now,
            ActivatedAt = now
        };

        await _users.InsertAsync(user);
        return user.ToResponse();
    }

    // Updates a staff account. An optional new password resets the old one.
    public async Task<UserResponse> UpdateAsync(string nic, UpdateStaffUserRequest request, CurrentUser actor)
    {
        var user = await GetStaffUserAsync(nic);
        var newRole = EnsureStaffRole(request.Role);
        var email = NormalizeEmail(request.Email);

        if (await _users.EmailExistsAsync(email, user.Nic))
            throw new ConflictException("This email address is already in use.");

        var losesBackofficeRole = user.Role == UserRole.Backoffice && newRole != UserRole.Backoffice;
        if (losesBackofficeRole && user.Nic == actor.Nic)
            throw new BusinessRuleException("You cannot remove your own Backoffice role.");

        if (losesBackofficeRole && user.Status == AccountStatus.Active)
            await EnsureAnotherActiveBackofficeAsync();

        if (!string.IsNullOrEmpty(request.NewPassword))
        {
            PasswordPolicy.Ensure(request.NewPassword);
            user.PasswordHash = _hasher.Hash(request.NewPassword);
        }

        user.FullName = request.FullName.Trim();
        user.Email = email;
        user.Phone = request.Phone.Trim();
        user.Role = newRole;
        user.UpdatedAt = _clock.UtcNow;

        await _users.UpdateAsync(user);
        return user.ToResponse();
    }

    // Activates or deactivates a staff account.
    public async Task<UserResponse> SetStatusAsync(string nic, bool isActive, CurrentUser actor)
    {
        var user = await GetStaffUserAsync(nic);
        var now = _clock.UtcNow;

        if (isActive)
        {
            user.Status = AccountStatus.Active;
            user.ActivatedAt = now;
            user.ActivatedBy = actor.Nic;
        }
        else
        {
            if (user.Nic == actor.Nic)
                throw new BusinessRuleException("You cannot deactivate your own account.");

            if (user.Role == UserRole.Backoffice && user.Status == AccountStatus.Active)
                await EnsureAnotherActiveBackofficeAsync();

            user.Status = AccountStatus.Deactivated;
            user.DeactivatedAt = now;
        }

        user.UpdatedAt = now;
        await _users.UpdateAsync(user);
        return user.ToResponse();
    }

    // Loads a user and makes sure it is a staff account.
    private async Task<User> GetStaffUserAsync(string nic)
    {
        var user = await _users.GetByNicAsync(NicValidator.Normalize(nic));
        if (user == null || user.Role == UserRole.Prosumer)
            throw new NotFoundException("Staff user not found.");

        return user;
    }

    // Web users can only be Backoffice or Grid Operator.
    private static UserRole EnsureStaffRole(UserRole? role)
    {
        if (role is not (UserRole.Backoffice or UserRole.GridOperator))
            throw new BusinessRuleException("Role must be Backoffice or GridOperator.");

        return role.Value;
    }

    // The system must always keep at least one active Backoffice account.
    private async Task EnsureAnotherActiveBackofficeAsync()
    {
        var activeCount = await _users.CountAsync(UserRole.Backoffice, AccountStatus.Active);
        if (activeCount <= 1)
            throw new BusinessRuleException("At least one active Backoffice account must remain.");
    }

    // Emails are compared in lower case.
    private static string NormalizeEmail(string email)
    {
        return email.Trim().ToLowerInvariant();
    }
}
