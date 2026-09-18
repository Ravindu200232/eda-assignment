/*
 * File:    BookingSummaryDto.java
 * Module:  Dashboards
 * Owner:   Malith
 * Purpose: The short form of a booking the dashboard shows: enough for one
 *          line in a list, without the details the booking page needs.
 */
package lk.sliit.solargrid.data.remote.dto;

public class BookingSummaryDto {

    public String id;
    public String referenceNo;
    public String prosumerNic;
    public String prosumerName;
    public String stationName;

    /** Start and end of the slot (UTC). */
    public String startTime;
    public String endTime;

    /** "Export" or "Import". */
    public String tradeType;

    public double energyKwh;

    /** "Pending" or "Approved" on the dashboard. */
    public String status;
}
