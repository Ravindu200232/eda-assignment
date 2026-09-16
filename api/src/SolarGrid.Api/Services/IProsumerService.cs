/*
 * File:    IProsumerService.cs
 * Module:  Prosumer Accounts
 * Owner:   Malith
 * Purpose: Registration, profile and activation rules for solar prosumers.
 */
using SolarGrid.Api.Common;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Models;
using SolarGrid.Api.Security;

namespace SolarGrid.Api.Services;

public interface IProsumerService
{
    Task<UserResponse> RegisterAsync(RegisterProsumerRequest request);

    Task<UserResponse> CreateAsync(RegisterProsumerRequest request, CurrentUser actor);

    Task<UserResponse> GetOwnProfileAsync(CurrentUser caller);

    Task<UserResponse> UpdateOwnProfileAsync(CurrentUser caller, UpdateProsumerRequest request);

    Task DeactivateOwnAccountAsync(CurrentUser caller, DeactivateAccountRequest request);

    Task<PagedResult<UserResponse>> ListAsync(AccountStatus? status, string? search, int page, int pageSize);

    Task<IReadOnlyList<UserResponse>> ListPendingActivationsAsync();

    Task<UserResponse> GetAsync(string nic);

    Task<UserResponse> UpdateAsync(string nic, UpdateProsumerRequest request);

    Task<UserResponse> DeactivateAsync(string nic);

    Task<UserResponse> ActivateAsync(string nic, CurrentUser actor);
}
