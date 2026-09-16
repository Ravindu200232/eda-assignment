/*
 * File:    AuthController.cs
 * Module:  Authentication
 * Owner:   Ravindu
 * Purpose: HTTP endpoints for login, the current profile and password change.
 */
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Security;
using SolarGrid.Api.Services;

namespace SolarGrid.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    // Needs the authentication service.
    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    // POST api/auth/login - returns a JWT for web and mobile users.
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        return Ok(await _authService.LoginAsync(request));
    }

    // GET api/auth/me - details of the signed-in user.
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserResponse>> Me()
    {
        var caller = CurrentUser.From(User);
        return Ok(await _authService.GetProfileAsync(caller.Nic));
    }

    // POST api/auth/change-password - any signed-in user can change their password.
    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        var caller = CurrentUser.From(User);
        await _authService.ChangePasswordAsync(caller.Nic, request);
        return NoContent();
    }
}
