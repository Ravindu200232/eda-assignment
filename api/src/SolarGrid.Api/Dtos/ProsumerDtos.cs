/*
 * File:    ProsumerDtos.cs
 * Module:  Prosumer Accounts
 * Owner:   Malith
 * Purpose: Request shapes for prosumer registration, profile updates and deactivation.
 *          Prosumer details are returned with UserResponse.
 */
using System.ComponentModel.DataAnnotations;

namespace SolarGrid.Api.Dtos;

public class RegisterProsumerRequest
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

    [Required(ErrorMessage = "Address is required.")]
    [StringLength(200, MinimumLength = 5, ErrorMessage = "Address must be 5 to 200 characters.")]
    public string Address { get; set; } = string.Empty;

    [StringLength(30, ErrorMessage = "Meter number can have at most 30 characters.")]
    public string? MeterNumber { get; set; }

    [Range(0.1, 1000, ErrorMessage = "Solar capacity must be between 0.1 and 1000 kW.")]
    public double? SolarCapacityKw { get; set; }
}

public class UpdateProsumerRequest
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

    [Required(ErrorMessage = "Address is required.")]
    [StringLength(200, MinimumLength = 5, ErrorMessage = "Address must be 5 to 200 characters.")]
    public string Address { get; set; } = string.Empty;

    [StringLength(30, ErrorMessage = "Meter number can have at most 30 characters.")]
    public string? MeterNumber { get; set; }

    [Range(0.1, 1000, ErrorMessage = "Solar capacity must be between 0.1 and 1000 kW.")]
    public double? SolarCapacityKw { get; set; }
}

public class DeactivateAccountRequest
{
    // The prosumer confirms the action with their password.
    [Required(ErrorMessage = "Enter your password to confirm.")]
    public string Password { get; set; } = string.Empty;
}
