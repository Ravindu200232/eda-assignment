/*
 * File:    HealthController.cs
 * Module:  Operations
 * Owner:   Ravindu
 * Purpose: Lets clients and the IIS smoke test check that the API and MongoDB are up.
 */
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolarGrid.Api.Common;
using SolarGrid.Api.Data;

namespace SolarGrid.Api.Controllers;

[ApiController]
[Route("api/health")]
[AllowAnonymous]
public class HealthController : ControllerBase
{
    private readonly MongoDbContext _db;
    private readonly AppClock _clock;

    // Needs the database context and the clock.
    public HealthController(MongoDbContext db, AppClock clock)
    {
        _db = db;
        _clock = clock;
    }

    // GET api/health - 200 when MongoDB answers, otherwise 503.
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var databaseUp = await _db.PingAsync();
        var body = new
        {
            status = databaseUp ? "Healthy" : "Unhealthy",
            database = databaseUp ? "Connected" : "Not reachable",
            serverTimeUtc = _clock.UtcNow
        };

        return databaseUp ? Ok(body) : StatusCode(StatusCodes.Status503ServiceUnavailable, body);
    }
}
