/*
 * File:    OperatorCheckInController.cs
 * Module:  Operator Check-in
 * Owner:   Ravindu
 * Purpose: HTTP endpoints used by Grid Operators at the station: verify a
 *          prosumer's QR code and finish the energy transfer.
 */
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Security;
using SolarGrid.Api.Services;

namespace SolarGrid.Api.Controllers;

[ApiController]
[Route("api/checkin")]
[Authorize(Roles = Roles.Staff)]
public class OperatorCheckInController : ControllerBase
{
    private readonly ICheckInService _checkInService;

    // Needs the check-in service.
    public OperatorCheckInController(ICheckInService checkInService)
    {
        _checkInService = checkInService;
    }

    // POST api/checkin/verify - the operator scans the prosumer's QR code.
    [HttpPost("verify")]
    public async Task<ActionResult<CheckInResponse>> Verify(VerifyQrRequest request)
    {
        return Ok(await _checkInService.VerifyAsync(request, CurrentUser.From(User)));
    }

    // POST api/checkin/{reservationId}/complete - records the delivered energy and closes the booking.
    [HttpPost("{reservationId}/complete")]
    public async Task<ActionResult<ReservationResponse>> Complete(string reservationId, CompleteTransferRequest request)
    {
        return Ok(await _checkInService.CompleteAsync(reservationId, request, CurrentUser.From(User)));
    }
}
