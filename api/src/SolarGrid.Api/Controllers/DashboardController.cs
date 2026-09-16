/*
 * File:    DashboardController.cs
 * Module:  Dashboards
 * Owner:   Malith
 * Purpose: HTTP endpoints for the staff, prosumer and public summaries.
 */
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Security;
using SolarGrid.Api.Services;

namespace SolarGrid.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    // Needs the dashboard service.
    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    // GET api/dashboard/summary - web dashboard for Backoffice and Grid Operators.
    [HttpGet("summary")]
    [Authorize(Roles = Roles.Staff)]
    public async Task<ActionResult<StaffDashboardResponse>> Summary()
    {
        return Ok(await _dashboardService.GetStaffSummaryAsync());
    }

    // GET api/dashboard/my-summary - mobile dashboard for the signed-in prosumer.
    [HttpGet("my-summary")]
    [Authorize(Roles = Roles.Prosumer)]
    public async Task<ActionResult<ProsumerDashboardResponse>> MySummary()
    {
        return Ok(await _dashboardService.GetProsumerSummaryAsync(CurrentUser.From(User)));
    }

    // GET api/dashboard/public - numbers for the public home page.
    [HttpGet("public")]
    [AllowAnonymous]
    public async Task<ActionResult<PublicSummaryResponse>> Public()
    {
        return Ok(await _dashboardService.GetPublicSummaryAsync());
    }
}
