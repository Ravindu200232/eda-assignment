/*
 * File:    BookingRequests.java
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: What the app sends to make, change and cancel a booking. The API
 *          checks the 7-day window, the 12-hour notice, the free bays and the
 *          energy limit of the station, so these are only the chosen values.
 */
package lk.sliit.solargrid.data.remote.dto;

public final class BookingRequests {

    /** "Export" sells solar energy to the grid; "Import" charges from it. */
    public static final String EXPORT = "Export";
    public static final String IMPORT = "Import";

    /** Nobody builds this class; it only groups the requests. */
    private BookingRequests() {
    }

    /** POST api/reservations and PUT api/reservations/{id}: slot, energy and direction. */
    public static class Booking {

        public String slotId;
        public Double energyKwh;
        public String tradeType;

        /** Holds the three choices of the booking form. */
        public Booking(String slotId, Double energyKwh, String tradeType) {
            this.slotId = slotId;
            this.energyKwh = energyKwh;
            this.tradeType = tradeType;
        }
    }

    /** POST api/reservations/{id}/cancel: an optional reason. */
    public static class Cancel {

        /** Left out of the JSON when empty, which the API accepts. */
        public String reason;

        /** Holds the reason, or null for none. */
        public Cancel(String reason) {
            this.reason = reason;
        }
    }
}
