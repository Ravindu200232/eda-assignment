/*
 * File:    CurrentUser.cs
 * Module:  Security
 * Owner:   Ravindu
 * Purpose: The signed-in caller, passed from controllers to services so that
 *          permission rules stay inside the service layer.
 */
using System.Security.Claims;
using SolarGrid.Api.Common;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Security;

public class CurrentUser
{
    // Creates a caller from a NIC and a role.
    public CurrentUser(string nic, UserRole role)
    {
        Nic = nic;
        Role = role;
    }

    public string Nic { get; }

    public UserRole Role { get; }

    public bool IsBackoffice => Role == UserRole.Backoffice;

    public bool IsStaff => Role is UserRole.Backoffice or UserRole.GridOperator;

    // Reads the caller from the claims inside the JWT.
    public static CurrentUser From(ClaimsPrincipal principal)
    {
        var nic = principal.FindFirstValue(JwtClaimNames.Nic);
        var roleText = principal.FindFirstValue(JwtClaimNames.Role);

        if (string.IsNullOrEmpty(nic) || !Enum.TryParse<UserRole>(roleText, out var role))
            throw new UnauthorizedException("Please log in to continue.");

        return new CurrentUser(nic, role);
    }
}
