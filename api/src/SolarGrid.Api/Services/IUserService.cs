/*
 * File:    IUserService.cs
 * Module:  Staff Users
 * Owner:   Ravindu
 * Purpose: Management of Backoffice and Grid Operator accounts.
 */
using SolarGrid.Api.Common;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Models;
using SolarGrid.Api.Security;

namespace SolarGrid.Api.Services;

public interface IUserService
{
    Task<PagedResult<UserResponse>> ListAsync(UserRole? role, AccountStatus? status, string? search, int page, int pageSize);

    Task<UserResponse> GetAsync(string nic);

    Task<UserResponse> CreateAsync(CreateStaffUserRequest request);

    Task<UserResponse> UpdateAsync(string nic, UpdateStaffUserRequest request, CurrentUser actor);

    Task<UserResponse> SetStatusAsync(string nic, bool isActive, CurrentUser actor);
}
