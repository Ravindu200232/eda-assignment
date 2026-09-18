/*
 * File:    CompleteTransferRequest.java
 * Module:  Operator Check-in
 * Owner:   Ravindu
 * Purpose: What the app sends to POST api/checkin/{id}/complete: the same code
 *          again and the energy that was really delivered.
 */
package lk.sliit.solargrid.data.remote.dto;

public class CompleteTransferRequest {

    public String payload;

    public Double deliveredKwh;

    /** Carries the code and the measured kWh. */
    public CompleteTransferRequest(String payload, Double deliveredKwh) {
        this.payload = payload;
        this.deliveredKwh = deliveredKwh;
    }
}
