/*
 * File:    PasswordPolicy.cs
 * Module:  Security
 * Owner:   Ravindu
 * Purpose: The password rule shared by staff and prosumer accounts.
 */
using SolarGrid.Api.Common;

namespace SolarGrid.Api.Security;

public static class PasswordPolicy
{
    public const string Message = "Password must be at least 8 characters and contain both letters and numbers.";

    // True when the password is long enough and mixes letters and digits.
    public static bool IsStrong(string? password)
    {
        return password is { Length: >= 8 }
            && password.Any(char.IsLetter)
            && password.Any(char.IsDigit);
    }

    // Throws a friendly error when the password is too weak.
    public static void Ensure(string? password)
    {
        if (!IsStrong(password))
            throw new BusinessRuleException(Message);
    }
}
