/*
 * File:    QrCodeDto.java
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: What GET api/reservations/{id}/qr sends for an approved booking:
 *          the signed text that the phone draws as a QR code for the operator.
 */
package lk.sliit.solargrid.data.remote.dto;

public class QrCodeDto {

    public String reservationId;
    public String referenceNo;
    public String stationName;
    public String startTime;
    public String endTime;

    /** The signed text, for example "SSG1.id.nonce.signature". */
    public String payload;
}
