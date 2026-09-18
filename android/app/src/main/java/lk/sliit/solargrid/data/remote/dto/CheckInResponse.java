/*
 * File:    CheckInResponse.java
 * Module:  Operator Check-in
 * Owner:   Ravindu
 * Purpose: What POST api/checkin/verify sends back: whether the transfer may
 *          be finished now, a sentence for the operator, the phone number to
 *          call, the check-in window and the booking itself.
 */
package lk.sliit.solargrid.data.remote.dto;

public class CheckInResponse {

    /** True only inside the check-in window, for an approved booking. */
    public boolean canComplete;

    /** The explanation written by the API, shown on the result screen. */
    public String message;

    public String prosumerPhone;

    /** Start of the window in which the operator may finish the transfer. */
    public String checkInOpensAt;

    /** End of that window. */
    public String checkInClosesAt;

    public ReservationDto reservation;
}
