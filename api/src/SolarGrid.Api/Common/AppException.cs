/*
 * File:    AppException.cs
 * Module:  Common
 * Owner:   Ravindu
 * Purpose: Errors that services throw on purpose when a request breaks a rule.
 *          ErrorHandlingMiddleware turns them into JSON error responses.
 */
namespace SolarGrid.Api.Common;

public abstract class AppException : Exception
{
    // Keeps the HTTP status and a short title next to the message.
    protected AppException(string message, int statusCode, string title) : base(message)
    {
        StatusCode = statusCode;
        Title = title;
    }

    public int StatusCode { get; }

    public string Title { get; }
}

public class BusinessRuleException : AppException
{
    // The request is well formed but breaks a business rule (HTTP 400).
    public BusinessRuleException(string message)
        : base(message, StatusCodes.Status400BadRequest, "Request not allowed") { }
}

public class UnauthorizedException : AppException
{
    // Login failed or the caller is not signed in (HTTP 401).
    public UnauthorizedException(string message)
        : base(message, StatusCodes.Status401Unauthorized, "Unauthorized") { }
}

public class ForbiddenException : AppException
{
    // The caller is signed in but may not do this (HTTP 403).
    public ForbiddenException(string message)
        : base(message, StatusCodes.Status403Forbidden, "Forbidden") { }
}

public class NotFoundException : AppException
{
    // The requested record does not exist (HTTP 404).
    public NotFoundException(string message)
        : base(message, StatusCodes.Status404NotFound, "Not found") { }
}

public class ConflictException : AppException
{
    // The record clashes with existing data, e.g. a duplicate NIC (HTTP 409).
    public ConflictException(string message)
        : base(message, StatusCodes.Status409Conflict, "Conflict") { }
}
