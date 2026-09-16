/*
 * File:    ValidationResponse.cs
 * Module:  Common
 * Owner:   Ravindu
 * Purpose: Shapes the automatic 400 response for invalid request bodies so it
 *          matches our other errors and has a readable "detail" line.
 */
using Microsoft.AspNetCore.Mvc;

namespace SolarGrid.Api.Common;

// Source: API-03 (sources/api-sources.md) - replacing InvalidModelStateResponseFactory.
public static class ValidationResponse
{
    // Lists every field error and repeats the first one as "detail".
    public static IActionResult Create(ActionContext context)
    {
        var problem = new ValidationProblemDetails(context.ModelState)
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Validation failed",
            Detail = FirstMessage(context) ?? "Some fields are missing or invalid.",
            Instance = context.HttpContext.Request.Path
        };

        var result = new BadRequestObjectResult(problem);
        result.ContentTypes.Add("application/problem+json");
        return result;
    }

    // JSON type errors (keys like "$.role") come first because they explain why the body was rejected.
    private static string? FirstMessage(ActionContext context)
    {
        var failed = context.ModelState.Where(e => e.Value is { Errors.Count: > 0 }).ToList();

        var jsonError = failed.FirstOrDefault(e => e.Key.StartsWith('$'));
        if (jsonError.Key != null)
            return $"'{jsonError.Key.TrimStart('$', '.')}' has an invalid value.";

        return failed.Select(e => e.Value!.Errors[0].ErrorMessage).FirstOrDefault();
    }
}
