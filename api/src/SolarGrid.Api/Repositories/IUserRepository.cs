/*
 * File:    IUserRepository.cs
 * Module:  Data Access
 * Owner:   Ravindu
 * Purpose: Queries for the UserDetails collection. No business rules here.
 */
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Repositories;

public interface IUserRepository
{
    Task<User?> GetByNicAsync(string nic);

    Task<User?> GetByEmailAsync(string email);

    Task<bool> EmailExistsAsync(string email, string? exceptNic = null);

    Task<(IReadOnlyList<User> Items, long Total)> SearchAsync(
        IReadOnlyCollection<UserRole> roles, AccountStatus? status, string? search, int page, int pageSize);

    Task<long> CountAsync(UserRole role, AccountStatus? status = null);

    Task InsertAsync(User user);

    Task UpdateAsync(User user);

    Task SetLastLoginAsync(string nic, DateTime loginTime);
}
