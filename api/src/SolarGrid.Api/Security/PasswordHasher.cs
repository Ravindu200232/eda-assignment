/*
 * File:    PasswordHasher.cs
 * Module:  Security
 * Owner:   Ravindu
 * Purpose: Hashes and checks passwords with BCrypt. Plain passwords are never stored.
 */
namespace SolarGrid.Api.Security;

public interface IPasswordHasher
{
    string Hash(string password);

    bool Verify(string password, string passwordHash);
}

// Source: API-06 (sources/api-sources.md) - BCrypt.Net-Next usage.
public class PasswordHasher : IPasswordHasher
{
    private readonly int _workFactor;

    // A higher work factor is slower and harder to crack. Tests use a low one.
    public PasswordHasher(int workFactor)
    {
        _workFactor = workFactor;
    }

    // Returns a salted BCrypt hash.
    public string Hash(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password, _workFactor);
    }

    // Compares a password with a stored hash.
    public bool Verify(string password, string passwordHash)
    {
        if (string.IsNullOrEmpty(passwordHash))
            return false;

        return BCrypt.Net.BCrypt.Verify(password, passwordHash);
    }
}
