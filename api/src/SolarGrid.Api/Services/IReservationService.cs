/*
 * File:    IReservationService.cs
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: The booking workflow: create, change, cancel, approve, reject, list and QR codes.
 */
using SolarGrid.Api.Common;
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Security;

namespace SolarGrid.Api.Services;

public interface IReservationService
{
    Task<PagedResult<ReservationResponse>> ListAsync(ReservationQuery query, CurrentUser caller);

    Task<ReservationResponse> GetAsync(string id, CurrentUser caller);

    Task<ReservationResponse> CreateAsync(CreateReservationRequest request, CurrentUser caller);

    Task<ReservationResponse> UpdateAsync(string id, UpdateReservationRequest request, CurrentUser caller);

    Task<ReservationResponse> CancelAsync(string id, CancelReservationRequest? request, CurrentUser caller);

    Task<ReservationResponse> ApproveAsync(string id, CurrentUser caller);

    Task<ReservationResponse> RejectAsync(string id, RejectReservationRequest request, CurrentUser caller);

    Task<QrCodeResponse> GetQrCodeAsync(string id, CurrentUser caller);
}
