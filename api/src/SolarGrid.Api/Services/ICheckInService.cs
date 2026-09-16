/*
 * File:    ICheckInService.cs
 * Module:  Operator Check-in
 * Owner:   Ravindu
 * Purpose: QR verification and energy transfer completion for Grid Operators.
 */
using SolarGrid.Api.Dtos;
using SolarGrid.Api.Security;

namespace SolarGrid.Api.Services;

public interface ICheckInService
{
    Task<CheckInResponse> VerifyAsync(VerifyQrRequest request, CurrentUser caller);

    Task<ReservationResponse> CompleteAsync(string reservationId, CompleteTransferRequest request, CurrentUser caller);
}
