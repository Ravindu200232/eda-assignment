/*
 * File:    Roles.cs
 * Module:  Security
 * Owner:   Ravindu
 * Purpose: Role names used in [Authorize] attributes and JWT tokens.
 */
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Security;

public static class Roles
{
    public const string Backoffice = nameof(UserRole.Backoffice);
    public const string GridOperator = nameof(UserRole.GridOperator);
    public const string Prosumer = nameof(UserRole.Prosumer);

    // Both web roles, for endpoints any staff member may use.
    public const string Staff = Backoffice + "," + GridOperator;
}
