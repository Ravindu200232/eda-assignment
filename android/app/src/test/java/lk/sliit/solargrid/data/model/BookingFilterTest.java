/*
 * File:    BookingFilterTest.java
 * Module:  Tests
 * Owner:   Hamnad
 * Purpose: Checks that the booking filter writes its choices the way the API
 *          reads them, knows when anything besides the tab is set, and clears
 *          everything but the tab.
 */
package lk.sliit.solargrid.data.model;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

import java.time.LocalDate;

public class BookingFilterTest {

    /** A new filter shows current bookings with nothing else set. */
    @Test
    public void startsOnTheCurrentTabWithoutFilters() {
        BookingFilter filter = new BookingFilter();

        assertEquals(BookingFilter.CURRENT, filter.scope);
        assertFalse(filter.hasExtraFilters());
        assertNull(filter.fromText());
        assertNull(filter.toText());
        assertNull(filter.searchText());
    }

    /** Dates are written as the API expects them, and the search without spaces around it. */
    @Test
    public void writesTheChoicesForTheApi() {
        BookingFilter filter = new BookingFilter();
        filter.from = LocalDate.of(2026, 9, 5);
        filter.to = LocalDate.of(2026, 9, 12);
        filter.search = "  Malabe ";

        assertEquals("2026-09-05", filter.fromText());
        assertEquals("2026-09-12", filter.toText());
        assertEquals("Malabe", filter.searchText());
        assertTrue(filter.hasExtraFilters());
    }

    /** A search of only spaces does not count as a filter. */
    @Test
    public void ignoresABlankSearch() {
        BookingFilter filter = new BookingFilter();
        filter.search = "   ";

        assertNull(filter.searchText());
        assertFalse(filter.hasExtraFilters());
    }

    /** Clearing keeps the tab but forgets the status, station, dates and search. */
    @Test
    public void clearsEverythingButTheTab() {
        BookingFilter filter = new BookingFilter();
        filter.scope = BookingFilter.HISTORY;
        filter.status = "Cancelled";
        filter.stationId = "st-mal";
        filter.stationName = "SLIIT Malabe Campus Microgrid";
        filter.from = LocalDate.of(2026, 9, 5);
        filter.to = LocalDate.of(2026, 9, 12);
        filter.search = "RSV";

        filter.clearExtraFilters();

        assertEquals(BookingFilter.HISTORY, filter.scope);
        assertFalse(filter.hasExtraFilters());
        assertNull(filter.stationName);
    }
}
