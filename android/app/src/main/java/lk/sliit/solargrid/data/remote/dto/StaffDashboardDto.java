/*
 * File:    StaffDashboardDto.java
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: What GET api/dashboard/summary sends to staff. The operator's
 *          "Today" tab shows three of its numbers: bookings starting today,
 *          bookings waiting for approval and approved bookings still to come.
 *          The API counts them over all stations.
 */
package lk.sliit.solargrid.data.remote.dto;

import java.util.ArrayList;
import java.util.List;

public class StaffDashboardDto {

    /** Bookings waiting for Backoffice approval. */
    public long pendingReservations;

    /** Approved bookings whose time has not come yet. */
    public long approvedFutureReservations;

    /** Bookings that start today (Sri Lankan time), whatever their status. */
    public long todaysReservations;

    public long activeStations;
    public long totalStations;
    public long pendingActivations;
    public long activeProsumers;

    /** The next bookings at all stations, soonest first. */
    public List<BookingSummaryDto> upcomingReservations = new ArrayList<>();

    /** When the API worked the numbers out (UTC). */
    public String generatedAt;
}
