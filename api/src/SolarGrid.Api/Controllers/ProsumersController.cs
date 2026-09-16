/*
 * File:    ProsumersController.cs
 * Module:  Prosumer Accounts
 * Owner:   Malith
 * Purpose: HTTP endpoints for prosumer self-service (mobile app) and
 *          prosumer management by staff (web app).
 */
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolarGrid.Api.Common;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Models;
using SolarGrid.Api.Security;
using SolarGrid.Api.Services;

namespace SolarGrid.Api.Controllers;

[ApiController]
[Route("api/prosumers")]
public class ProsumersController : ControllerBase
{
    private readonly IProsumerService _prosumerService;

    // Needs the prosumer service.
    public ProsumersController(IProsumerService prosumerService)
    {
        _prosumerService = prosumerService;
    }

    // POST api/prosumers/register - sign-up from the mobile app (no login needed).
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<UserResponse>> Register(RegisterProsumerRequest request)
    {
        var prosumer = await _prosumerService.RegisterAsync(request);
        return StatusCode(StatusCodes.Status201Created, prosumer);
    }

    // GET api/prosumers/me
    [HttpGet("me")]
    [Authorize(Roles = Roles.Prosumer)]
    public async Task<ActionResult<UserResponse>> GetMe()
    {
        return Ok(await _prosumerService.GetOwnProfileAsync(CurrentUser.From(User)));
    }

    // PUT api/prosumers/me
    [HttpPut("me")]
    [Authorize(Roles = Roles.Prosumer)]
    public async Task<ActionResult<UserResponse>> UpdateMe(UpdateProsumerRequest request)
    {
        return Ok(await _prosumerService.UpdateOwnProfileAsync(CurrentUser.From(User), request));
    }

    // POST api/prosumers/me/deactivate - the prosumer closes their own account.
    [HttpPost("me/deactivate")]
    [Authorize(Roles = Roles.Prosumer)]
    public async Task<IActionResult> DeactivateMe(DeactivateAccountRequest request)
    {
        await _prosumerService.DeactivateOwnAccountAsync(CurrentUser.From(User), request);
        return NoContent();
    }

    // GET api/prosumers?status=&search=&page=&pageSize=
    [HttpGet]
    [Authorize(Roles = Roles.Staff)]
    public async Task<ActionResult<PagedResult<UserResponse>>> List(
        [FromQuery] AccountStatus? status, [FromQuery] string? search,
        [FromQuery] int page = 1, [FromQuery] int pageSize = PagedResult<UserResponse>.DefaultPageSize)
    {
        return Ok(await _prosumerService.ListAsync(status, search, page, pageSize));
    }

    // GET api/prosumers/pending-activations - sign-ups waiting for Backoffice.
    [HttpGet("pending-activations")]
    [Authorize(Roles = Roles.Backoffice)]
    public async Task<ActionResult<IReadOnlyList<UserResponse>>> PendingActivations()
    {
        return Ok(await _prosumerService.ListPendingActivationsAsync());
    }

    // GET api/prosumers/{nic}
    [HttpGet("{nic}")]
    [Authorize(Roles = Roles.Staff)]
    public async Task<ActionResult<UserResponse>> Get(string nic)
    {
        return Ok(await _prosumerService.GetAsync(nic));
    }

    // POST api/prosumers - staff create an active prosumer account.
    [HttpPost]
    [Authorize(Roles = Roles.Staff)]
    public async Task<ActionResult<UserResponse>> Create(RegisterProsumerRequest request)
    {
        var prosumer = await _prosumerService.CreateAsync(request, CurrentUser.From(User));
        return CreatedAtAction(nameof(Get), new { nic = prosumer.Nic }, prosumer);
    }

    // PUT api/prosumers/{nic}
    [HttpPut("{nic}")]
    [Authorize(Roles = Roles.Staff)]
    public async Task<ActionResult<UserResponse>> Update(string nic, UpdateProsumerRequest request)
    {
        return Ok(await _prosumerService.UpdateAsync(nic, request));
    }

    // POST api/prosumers/{nic}/deactivate
    [HttpPost("{nic}/deactivate")]
    [Authorize(Roles = Roles.Staff)]
    public async Task<ActionResult<UserResponse>> Deactivate(string nic)
    {
        return Ok(await _prosumerService.DeactivateAsync(nic));
    }

    // POST api/prosumers/{nic}/activate - Backoffice only.
    [HttpPost("{nic}/activate")]
    [Authorize(Roles = Roles.Backoffice)]
    public async Task<ActionResult<UserResponse>> Activate(string nic)
    {
        return Ok(await _prosumerService.ActivateAsync(nic, CurrentUser.From(User)));
    }
}
