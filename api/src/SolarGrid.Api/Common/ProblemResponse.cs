/*
 * File:    ProblemResponse.cs
 * Module:  Common
 * Owner:   Ravindu
 * Purpose: Writes errors in the standard ProblemDetails JSON shape so both
 *          clients can always read "title" and "detail".
 */
namespace SolarGrid.Api.Common;

// Source: API-03 (sources/api-sources.md) - ProblemDetails error format.
public static class ProblemResponse
{
    // Writes a ProblemDetails body with the given status code.
    public static Task WriteAsync(HttpContext context, int status, string title, string detail)
    {
        return Results.Problem(detail: detail, instance: context.Request.Path, statusCode: status, title: title)
            .ExecuteAsync(context);
    }
}
