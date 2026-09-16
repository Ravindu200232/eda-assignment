/*
 * File:    UsersController.cs
 * Module:  Staff Users
 * Owner:   Ravindu
 * Purpose: HTTP endpoints for Backoffice and Grid Operator accounts.
 *          Only Backoffice users can reach these endpoints.
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
[Route("api/users")]
[Authorize(Roles = Roles.Backoffice)]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    // Needs the staff user service.
    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    // GET api/users?role=&status=&search=&page=&pageSize=
    [HttpGet]
    public async Task<ActionResult<PagedResult<UserResponse>>> List(
        [FromQuery] UserRole? role, [FromQuery] AccountStatus? status, [FromQuery] string? search,
        [FromQuery] int page = 1, [FromQuery] int pageSize = PagedResult<UserResponse>.DefaultPageSize)
    {
        return Ok(await _userService.ListAsync(role, status, search, page, pageSize));
    }

    // GET api/users/{nic}
    [HttpGet("{nic}")]
    public async Task<ActionResult<UserResponse>> Get(string nic)
    {
        return Ok(await _userService.GetAsync(nic));
    }

    // POST api/users - creates a Backoffice or Grid Operator account.
    [HttpPost]
    public async Task<ActionResult<UserResponse>> Create(CreateStaffUserRequest request)
    {
        var user = await _userService.CreateAsync(request);
        return CreatedAtAction(nameof(Get), new { nic = user.Nic }, user);
    }

    // PUT api/users/{nic}
    [HttpPut("{nic}")]
    public async Task<ActionResult<UserResponse>> Update(string nic, UpdateStaffUserRequest request)
    {
        return Ok(await _userService.UpdateAsync(nic, request, CurrentUser.From(User)));
    }

    // PATCH api/users/{nic}/status - activates or deactivates an account.
    [HttpPatch("{nic}/status")]
    public async Task<ActionResult<UserResponse>> ChangeStatus(string nic, ChangeStatusRequest request)
    {
        return Ok(await _userService.SetStatusAsync(nic, request.IsActive!.Value, CurrentUser.From(User)));
    }
}
