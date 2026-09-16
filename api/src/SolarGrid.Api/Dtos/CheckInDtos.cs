/*
 * File:    CheckInDtos.cs
 * Module:  Operator Check-in
 * Owner:   Ravindu
 * Purpose: Request and response shapes for scanning a booking QR code at a station
 *          and finishing the energy transfer.
 */
using System.ComponentModel.DataAnnotations;

namespace SolarGrid.Api.Dtos;

public class VerifyQrRequest
{
    // The text read from the QR code.
    [Required(ErrorMessage = "Scan or paste the QR code.")]
    public string Payload { get; set; } = string.Empty;
}

public class CompleteTransferRequest
{
    // The code is checked again when the transfer is finished.
    [Required(ErrorMessage = "Scan or paste the QR code.")]
    public string Payload { get; set; } = string.Empty;

    [Required(ErrorMessage = "Enter the delivered energy.")]
    [Range(0.01, 100000, ErrorMessage = "Delivered energy must be more than 0 kWh.")]
    public double? DeliveredKwh { get; set; }
}

public class CheckInResponse
{
    // True when the operator may finish the transfer now.
    public bool CanComplete { get; set; }

    // Short explanation to show on the operator's screen.
    public string Message { get; set; } = string.Empty;

    public string ProsumerPhone { get; set; } = string.Empty;

    public DateTime CheckInOpensAt { get; set; }

    public DateTime CheckInClosesAt { get; set; }

    public ReservationResponse Reservation { get; set; } = new();
}
