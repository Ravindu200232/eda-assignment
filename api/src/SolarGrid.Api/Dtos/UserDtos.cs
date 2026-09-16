/*
 * File:    UserDtos.cs
 * Module:  Staff Users
 * Owner:   Ravindu
 * Purpose: Request and response shapes for user accounts, plus the mapping
 *          from the User document. Password hashes never leave the API.
 */
using System.ComponentModel.DataAnnotations;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Dtos;

public class UserResponse
{
    public string Nic { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Phone { get; set; } = string.Empty;

    public UserRole Role { get; set; }

    public AccountStatus Status { get; set; }

    public string? Address { get; set; }

    public string? MeterNumber { get; set; }

    public double? SolarCapacityKw { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? ActivatedAt { get; set; }

    public DateTime? DeactivatedAt { get; set; }

    public DateTime? LastLoginAt { get; set; }
}

public class CreateStaffUserRequest
{
    [Required(ErrorMessage = "NIC is required.")]
    public string Nic { get; set; } = string.Empty;

    [Required(ErrorMessage = "Full name is required.")]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "Full name must be 3 to 100 characters.")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Enter a valid email address.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Phone number is required.")]
    [RegularExpression(ValidationPatterns.Phone, ErrorMessage = ValidationPatterns.PhoneMessage)]
    public string Phone { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required.")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "Role is required.")]
    public UserRole? Role { get; set; }
}

public class UpdateStaffUserRequest
{
    [Required(ErrorMessage = "Full name is required.")]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "Full name must be 3 to 100 characters.")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Enter a valid email address.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Phone number is required.")]
    [RegularExpression(ValidationPatterns.Phone, ErrorMessage = ValidationPatterns.PhoneMessage)]
    public string Phone { get; set; } = string.Empty;

    [Required(ErrorMessage = "Role is required.")]
    public UserRole? Role { get; set; }

    // Leave empty to keep the current password.
    public string? NewPassword { get; set; }
}

public class ChangeStatusRequest
{
    [Required(ErrorMessage = "Say whether the account should be active.")]
    public bool? IsActive { get; set; }
}

public static class ValidationPatterns
{
    // Sri Lankan numbers such as 0771234567 or +94771234567.
    public const string Phone = @"^(\+94|0)\d{9}$";
    public const string PhoneMessage = "Phone number must look like 0771234567 or +94771234567.";
}

public static class UserMappings
{
    // Copies the public fields of a user into a response.
    public static UserResponse ToResponse(this User user)
    {
        return new UserResponse
        {
            Nic = user.Nic,
            FullName = user.FullName,
            Email = user.Email,
            Phone = user.Phone,
            Role = user.Role,
            Status = user.Status,
            Address = user.Address,
            MeterNumber = user.MeterNumber,
            SolarCapacityKw = user.SolarCapacityKw,
            CreatedAt = user.CreatedAt,
            ActivatedAt = user.ActivatedAt,
            DeactivatedAt = user.DeactivatedAt,
            LastLoginAt = user.LastLoginAt
        };
    }
}
