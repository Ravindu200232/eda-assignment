/*
 * File:    ProsumerDashboardDto.java
 * Module:  Dashboards
 * Owner:   Malith
 * Purpose: What GET api/dashboard/my-summary sends back: the two numbers the
 *          brief asks for (pending bookings and approved bookings still to
 *          come), the finished transfers and a short list of what is next.
 */
package lk.sliit.solargrid.data.remote.dto;

import java.util.ArrayList;
import java.util.List;

public class ProsumerDashboardDto {

    /** Bookings waiting for Backoffice approval. */
    public long pendingCount;

    /** Approved bookings whose time has not come yet. */
    public long approvedFutureCount;

    /** Transfers that were finished at a station. */
    public long completedCount;

    /** Energy delivered in those transfers. */
    public double totalDeliveredKwh;

    /** The next booking, or null when nothing is coming up. */
    public BookingSummaryDto nextReservation;

    /** The coming bookings, soonest first. */
    public List<BookingSummaryDto> upcomingReservations = new ArrayList<>();

    /** When the API worked the numbers out (UTC). */
    public String generatedAt;
}
