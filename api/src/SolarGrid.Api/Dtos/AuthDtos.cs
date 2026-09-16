/*
 * File:    AuthDtos.cs
 * Module:  Authentication
 * Owner:   Ravindu
 * Purpose: Request and response shapes for login and password change.
 */
using System.ComponentModel.DataAnnotations;

namespace SolarGrid.Api.Dtos;

public class LoginRequest
{
    // NIC or email address.
    [Required(ErrorMessage = "Enter your NIC or email.")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "Enter your password.")]
    public string Password { get; set; } = string.Empty;
}

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public UserResponse User { get; set; } = new();
}

public class ChangePasswordRequest
{
    [Required(ErrorMessage = "Enter your current password.")]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "Enter a new password.")]
    public string NewPassword { get; set; } = string.Empty;
}
