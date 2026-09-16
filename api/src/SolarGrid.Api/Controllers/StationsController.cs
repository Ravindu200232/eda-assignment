/*
 * File:    StationsController.cs
 * Module:  Microgrid Stations
 * Owner:   Nimthara
 * Purpose: HTTP endpoints for microgrid stations, their schedules,
 *          battery slot availability and the nearby-station search.
 */
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Models;
using SolarGrid.Api.Security;
using SolarGrid.Api.Services;

namespace SolarGrid.Api.Controllers;

[ApiController]
[Route("api/stations")]
[Authorize]
public class StationsController : ControllerBase
{
    private readonly IStationService _stationService;

    // Needs the station service.
    public StationsController(IStationService stationService)
    {
        _stationService = stationService;
    }

    // GET api/stations?status=&search= - prosumers always get active stations only.
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StationResponse>>> List(
        [FromQuery] StationStatus? status, [FromQuery] string? search)
    {
        return Ok(await _stationService.ListAsync(status, search, CurrentUser.From(User)));
    }

    // GET api/stations/nearby?lat=6.91&lng=79.97&radiusKm=10 - for the map screen.
    [HttpGet("nearby")]
    public async Task<ActionResult<IReadOnlyList<NearbyStationResponse>>> Nearby(
        [FromQuery] double? lat, [FromQuery] double? lng, [FromQuery] double? radiusKm)
    {
        return Ok(await _stationService.FindNearbyAsync(lat, lng, radiusKm));
    }

    // GET api/stations/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<StationResponse>> Get(string id)
    {
        return Ok(await _stationService.GetAsync(id, CurrentUser.From(User)));
    }

    // POST api/stations - Backoffice registers a new station.
    [HttpPost]
    [Authorize(Roles = Roles.Backoffice)]
    public async Task<ActionResult<StationResponse>> Create(StationRequest request)
    {
        var station = await _stationService.CreateAsync(request);
        return CreatedAtAction(nameof(Get), new { id = station.Id }, station);
    }

    // PUT api/stations/{id}
    [HttpPut("{id}")]
    [Authorize(Roles = Roles.Backoffice)]
    public async Task<ActionResult<StationResponse>> Update(string id, StationRequest request)
    {
        return Ok(await _stationService.UpdateAsync(id, request));
    }

    // PUT api/stations/{id}/schedule - replaces the weekly opening hours.
    [HttpPut("{id}/schedule")]
    [Authorize(Roles = Roles.Backoffice)]
    public async Task<ActionResult<StationResponse>> UpdateSchedule(string id, ScheduleRequest request)
    {
        return Ok(await _stationService.UpdateScheduleAsync(id, request));
    }

    // PATCH api/stations/{id}/battery-slots - Grid Operators update availability.
    [HttpPatch("{id}/battery-slots")]
    [Authorize(Roles = Roles.Staff)]
    public async Task<ActionResult<StationResponse>> UpdateBatterySlots(string id, BatterySlotsRequest request)
    {
        return Ok(await _stationService.UpdateBatterySlotsAsync(id, request));
    }

    // POST api/stations/{id}/deactivate - blocked while active reservations exist.
    [HttpPost("{id}/deactivate")]
    [Authorize(Roles = Roles.Backoffice)]
    public async Task<ActionResult<StationResponse>> Deactivate(string id)
    {
        return Ok(await _stationService.DeactivateAsync(id));
    }

    // POST api/stations/{id}/activate
    [HttpPost("{id}/activate")]
    [Authorize(Roles = Roles.Backoffice)]
    public async Task<ActionResult<StationResponse>> Activate(string id)
    {
        return Ok(await _stationService.ActivateAsync(id));
    }
}
