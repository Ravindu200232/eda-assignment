/*
 * File:    UserRepository.cs
 * Module:  Data Access
 * Owner:   Ravindu
 * Purpose: MongoDB implementation of IUserRepository.
 */
using System.Text.RegularExpressions;
using MongoDB.Bson;
using MongoDB.Driver;
using SolarGrid.Api.Data;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Repositories;

public class UserRepository : IUserRepository
{
    private readonly IMongoCollection<User> _users;

    // Uses the UserDetails collection from the shared context.
    public UserRepository(MongoDbContext db)
    {
        _users = db.Users;
    }

    // Finds a user by NIC (the document id).
    public async Task<User?> GetByNicAsync(string nic)
    {
        return await _users.Find(u => u.Nic == nic).FirstOrDefaultAsync();
    }

    // Finds a user by email. Emails are stored in lower case.
    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _users.Find(u => u.Email == email).FirstOrDefaultAsync();
    }

    // Checks whether another user already has this email.
    public async Task<bool> EmailExistsAsync(string email, string? exceptNic = null)
    {
        var filter = Builders<User>.Filter.Eq(u => u.Email, email);
        if (exceptNic != null)
            filter &= Builders<User>.Filter.Ne(u => u.Nic, exceptNic);

        return await _users.Find(filter).AnyAsync();
    }

    // Returns one page of users filtered by role, status and a search text.
    public async Task<(IReadOnlyList<User> Items, long Total)> SearchAsync(
        IReadOnlyCollection<UserRole> roles, AccountStatus? status, string? search, int page, int pageSize)
    {
        var f = Builders<User>.Filter;
        var filter = f.In(u => u.Role, roles);

        if (status.HasValue)
            filter &= f.Eq(u => u.Status, status.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = new BsonRegularExpression(Regex.Escape(search.Trim()), "i");
            filter &= f.Or(f.Regex(u => u.FullName, pattern), f.Regex(u => u.Email, pattern), f.Regex(u => u.Nic, pattern));
        }

        var total = await _users.CountDocumentsAsync(filter);
        var items = await _users.Find(filter)
            .SortBy(u => u.FullName)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();

        return (items, total);
    }

    // Counts users with a role, optionally only in one status.
    public async Task<long> CountAsync(UserRole role, AccountStatus? status = null)
    {
        var filter = Builders<User>.Filter.Eq(u => u.Role, role);
        if (status.HasValue)
            filter &= Builders<User>.Filter.Eq(u => u.Status, status.Value);

        return await _users.CountDocumentsAsync(filter);
    }

    // Adds a new user document.
    public Task InsertAsync(User user)
    {
        return _users.InsertOneAsync(user);
    }

    // Saves all changes to an existing user.
    public Task UpdateAsync(User user)
    {
        return _users.ReplaceOneAsync(u => u.Nic == user.Nic, user);
    }

    // Records the time of a successful login.
    public Task SetLastLoginAsync(string nic, DateTime loginTime)
    {
        return _users.UpdateOneAsync(u => u.Nic == nic, Builders<User>.Update.Set(u => u.LastLoginAt, loginTime));
    }

    // All users with a role and status, oldest first (used as a waiting queue).
    public async Task<IReadOnlyList<User>> ListByStatusAsync(UserRole role, AccountStatus status)
    {
        return await _users.Find(u => u.Role == role && u.Status == status)
            .SortBy(u => u.CreatedAt)
            .ToListAsync();
    }
}
