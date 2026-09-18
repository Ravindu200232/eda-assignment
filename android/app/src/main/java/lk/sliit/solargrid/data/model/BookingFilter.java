/*
 * File:    BookingFilter.java
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: What the booking list is asked to show: the tab (current, waiting
 *          or history), an optional status, station and date range, and a
 *          search text. The API does the filtering; this class only carries
 *          the choices and writes them in the form the API expects.
 */
package lk.sliit.solargrid.data.model;

import androidx.annotation.Nullable;

import java.time.LocalDate;

import lk.sliit.solargrid.util.Times;

public class BookingFilter {

    /** Approved and not finished. */
    public static final String CURRENT = "Current";
    /** Waiting for Backoffice approval. */
    public static final String PENDING = "Pending";
    /** Completed, cancelled, rejected or already over. */
    public static final String HISTORY = "History";

    public String scope = CURRENT;

    @Nullable
    public String status;

    @Nullable
    public String stationId;

    /** The station name, only for the label of the filter chip. */
    @Nullable
    public String stationName;

    @Nullable
    public LocalDate from;

    @Nullable
    public LocalDate to;

    @Nullable
    public String search;

    /** True when anything besides the tab narrows the list. */
    public boolean hasExtraFilters() {
        return status != null || stationId != null || from != null || to != null
                || (search != null && !search.trim().isEmpty());
    }

    /** Forgets every filter but the tab. */
    public void clearExtraFilters() {
        status = null;
        stationId = null;
        stationName = null;
        from = null;
        to = null;
        search = null;
    }

    /** The "from" date as the API writes it, or null. */
    @Nullable
    public String fromText() {
        return from == null ? null : Times.isoDay(from);
    }

    /** The "to" date as the API writes it, or null. */
    @Nullable
    public String toText() {
        return to == null ? null : Times.isoDay(to);
    }

    /** The search text without spaces around it, or null when empty. */
    @Nullable
    public String searchText() {
        return search == null || search.trim().isEmpty() ? null : search.trim();
    }
}
