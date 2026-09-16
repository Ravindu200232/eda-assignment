/*
 * File:    ErrorHandlingMiddleware.cs
 * Module:  Middleware
 * Owner:   Ravindu
 * Purpose: Catches errors from any endpoint and returns them as ProblemDetails
 *          JSON, so controllers stay free of try/catch blocks.
 */
using MongoDB.Driver;
using SolarGrid.Api.Common;

namespace SolarGrid.Api.Middleware;

// Source: API-03 (sources/api-sources.md) - central exception handling in ASP.NET Core.
public class ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorHandlingMiddleware> _logger;

    // Receives the next step of the pipeline and a logger.
    public ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    // Runs the request and converts known errors to the right status code.
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (AppException ex) when (!context.Response.HasStarted)
        {
            await ProblemResponse.WriteAsync(context, ex.StatusCode, ex.Title, ex.Message);
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey && !context.Response.HasStarted)
        {
            await ProblemResponse.WriteAsync(context, StatusCodes.Status409Conflict, "Conflict",
                "A record with the same unique value already exists.");
        }
        catch (TimeoutException ex) when (!context.Response.HasStarted)
        {
            _logger.LogError(ex, "Database did not respond for {Method} {Path}", context.Request.Method, context.Request.Path);
            await ProblemResponse.WriteAsync(context, StatusCodes.Status503ServiceUnavailable, "Service unavailable",
                "The database is not reachable right now. Please try again shortly.");
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // The client closed the connection; nothing to send back.
        }
        catch (Exception ex) when (!context.Response.HasStarted)
        {
            _logger.LogError(ex, "Unhandled error for {Method} {Path}", context.Request.Method, context.Request.Path);
            await ProblemResponse.WriteAsync(context, StatusCodes.Status500InternalServerError, "Server error",
                "Something went wrong on the server. Please try again.");
        }
    }
}
