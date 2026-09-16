/*
 * File:    IAuthService.cs
 * Module:  Authentication
 * Owner:   Ravindu
 * Purpose: Login, current profile and password change.
 */
using SolarGrid.Api.Dtos;

namespace SolarGrid.Api.Services;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request);

    Task<UserResponse> GetProfileAsync(string nic);

    Task ChangePasswordAsync(string nic, ChangePasswordRequest request);
}
