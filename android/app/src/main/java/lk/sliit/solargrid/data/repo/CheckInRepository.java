/*
 * File:    CheckInRepository.java
 * Module:  Operator Check-in
 * Owner:   Ravindu
 * Purpose: The two calls a Grid Operator makes at the station: check the
 *          scanned QR code, then record the delivered energy. The API checks
 *          the signature, the station and the time window, so the app only
 *          passes the code on and shows the answer.
 */
package lk.sliit.solargrid.data.repo;

import lk.sliit.solargrid.data.remote.ApiCallback;
import lk.sliit.solargrid.data.remote.ApiCalls;
import lk.sliit.solargrid.data.remote.SolarGridApi;
import lk.sliit.solargrid.data.remote.dto.CheckInResponse;
import lk.sliit.solargrid.data.remote.dto.CompleteTransferRequest;
import lk.sliit.solargrid.data.remote.dto.ReservationDto;
import lk.sliit.solargrid.data.remote.dto.VerifyQrRequest;

public class CheckInRepository {

    private final SolarGridApi api;

    /** Needs the API calls. */
    public CheckInRepository(SolarGridApi api) {
        this.api = api;
    }

    /** Sends the scanned or typed code and returns what the API decided. */
    public void verify(String payload, ApiCallback<CheckInResponse> callback) {
        ApiCalls.enqueue(api.verifyQrCode(new VerifyQrRequest(payload)), callback);
    }

    /** Finishes the transfer with the energy the meter showed. */
    public void complete(String reservationId, String payload, double deliveredKwh,
                         ApiCallback<ReservationDto> callback) {
        ApiCalls.enqueue(api.completeTransfer(reservationId, new CompleteTransferRequest(payload, deliveredKwh)),
                callback);
    }
}
