/*
 * File:    SlotsController.cs
 * Module:  Energy Slots
 * Owner:   Nimthara
 * Purpose: HTTP endpoints for the bookable energy slots of each station.
 */
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Security;
using SolarGrid.Api.Services;

namespace SolarGrid.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class SlotsController : ControllerBase
{
    private readonly ISlotService _slotService;

    // Needs the slot service.
    public SlotsController(ISlotService slotService)
    {
        _slotService = slotService;
    }

    // GET api/stations/{stationId}/slots?from=2026-09-20&to=2026-09-26&onlyAvailable=true
    [HttpGet("stations/{stationId}/slots")]
    public async Task<ActionResult<IReadOnlyList<SlotResponse>>> ListForStation(string stationId,
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] bool onlyAvailable = false)
    {
        return Ok(await _slotService.ListForStationAsync(stationId, from, to, onlyAvailable, CurrentUser.From(User)));
    }

    // POST api/stations/{stationId}/slots - adds one slot.
    [HttpPost("stations/{stationId}/slots")]
    [Authorize(Roles = Roles.Staff)]
    public async Task<ActionResult<SlotResponse>> Create(string stationId, CreateSlotRequest request)
    {
        var slot = await _slotService.CreateAsync(stationId, request);
        return CreatedAtAction(nameof(Get), new { id = slot.Id }, slot);
    }

    // POST api/stations/{stationId}/slots/generate - fills days from the station schedule.
    [HttpPost("stations/{stationId}/slots/generate")]
    [Authorize(Roles = Roles.Staff)]
    public async Task<ActionResult<GenerateSlotsResponse>> Generate(string stationId, GenerateSlotsRequest request)
    {
        return Ok(await _slotService.GenerateAsync(stationId, request));
    }

    // GET api/slots/{id}
    [HttpGet("slots/{id}")]
    public async Task<ActionResult<SlotResponse>> Get(string id)
    {
        return Ok(await _slotService.GetAsync(id));
    }

    // PUT api/slots/{id} - changes capacity or opens/closes the slot.
    [HttpPut("slots/{id}")]
    [Authorize(Roles = Roles.Staff)]
    public async Task<ActionResult<SlotResponse>> Update(string id, UpdateSlotRequest request)
    {
        return Ok(await _slotService.UpdateAsync(id, request));
    }

    // DELETE api/slots/{id} - only when nobody has booked it.
    [HttpDelete("slots/{id}")]
    [Authorize(Roles = Roles.Staff)]
    public async Task<IActionResult> Delete(string id)
    {
        await _slotService.DeleteAsync(id);
        return NoContent();
    }
}
