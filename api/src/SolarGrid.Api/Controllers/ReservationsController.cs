/*
 * File:    ReservationsController.cs
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: HTTP endpoints for booking, changing, cancelling, approving and
 *          listing energy reservations, and for their QR codes.
 */
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using SolarGrid.Api.Common;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Security;
using SolarGrid.Api.Services;

namespace SolarGrid.Api.Controllers;

[ApiController]
[Route("api/reservations")]
[Authorize]
public class ReservationsController : ControllerBase
{
    private readonly IReservationService _reservationService;

    // Needs the reservation service.
    public ReservationsController(IReservationService reservationService)
    {
        _reservationService = reservationService;
    }

    // GET api/reservations?scope=current|pending|history&status=&stationId=&nic=&from=&to=&search=&page=&pageSize=
    [HttpGet]
    public async Task<ActionResult<PagedResult<ReservationResponse>>> List([FromQuery] ReservationQuery query)
    {
        return Ok(await _reservationService.ListAsync(query, CurrentUser.From(User)));
    }

    // GET api/reservations/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<ReservationResponse>> Get(string id)
    {
        return Ok(await _reservationService.GetAsync(id, CurrentUser.From(User)));
    }

    // POST api/reservations - prosumers book for themselves, staff book for a prosumer.
    [HttpPost]
    public async Task<ActionResult<ReservationResponse>> Create(CreateReservationRequest request)
    {
        var reservation = await _reservationService.CreateAsync(request, CurrentUser.From(User));
        return CreatedAtAction(nameof(Get), new { id = reservation.Id }, reservation);
    }

    // PUT api/reservations/{id} - needs 12 hours' notice.
    [HttpPut("{id}")]
    public async Task<ActionResult<ReservationResponse>> Update(string id, UpdateReservationRequest request)
    {
        return Ok(await _reservationService.UpdateAsync(id, request, CurrentUser.From(User)));
    }

    // POST api/reservations/{id}/cancel - needs 12 hours' notice. The body (reason) is optional.
    [HttpPost("{id}/cancel")]
    public async Task<ActionResult<ReservationResponse>> Cancel(string id,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] CancelReservationRequest? request)
    {
        return Ok(await _reservationService.CancelAsync(id, request, CurrentUser.From(User)));
    }

    // POST api/reservations/{id}/approve - issues the QR code.
    [HttpPost("{id}/approve")]
    [Authorize(Roles = Roles.Staff)]
    public async Task<ActionResult<ReservationResponse>> Approve(string id)
    {
        return Ok(await _reservationService.ApproveAsync(id, CurrentUser.From(User)));
    }

    // POST api/reservations/{id}/reject
    [HttpPost("{id}/reject")]
    [Authorize(Roles = Roles.Staff)]
    public async Task<ActionResult<ReservationResponse>> Reject(string id, RejectReservationRequest request)
    {
        return Ok(await _reservationService.RejectAsync(id, request, CurrentUser.From(User)));
    }

    // GET api/reservations/{id}/qr - text to show as a QR image.
    [HttpGet("{id}/qr")]
    public async Task<ActionResult<QrCodeResponse>> QrCode(string id)
    {
        return Ok(await _reservationService.GetQrCodeAsync(id, CurrentUser.From(User)));
    }
}
