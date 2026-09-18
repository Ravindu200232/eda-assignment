/*
 * File:    VerifyQrRequest.java
 * Module:  Operator Check-in
 * Owner:   Ravindu
 * Purpose: What the app sends to POST api/checkin/verify: the text read from
 *          the booking QR code.
 */
package lk.sliit.solargrid.data.remote.dto;

public class VerifyQrRequest {

    public String payload;

    /** Carries the scanned (or typed) code. */
    public VerifyQrRequest(String payload) {
        this.payload = payload;
    }
}
