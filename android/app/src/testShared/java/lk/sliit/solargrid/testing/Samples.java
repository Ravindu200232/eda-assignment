/*
 * File:    Samples.java
 * Module:  Tests
 * Owner:   Ravindu
 * Purpose: The JSON the tests answer with. Every piece was copied from the
 *          running Web API and only the names and dates were changed, so the
 *          tests keep matching what the app really receives.
 */
package lk.sliit.solargrid.testing;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;

public final class Samples {

    /** Nobody builds this class; it only holds text. */
    private Samples() {
    }

    /** A successful login for the given role. */
    public static String login(String role) {
        return "{\"token\":\"test-token\",\"expiresAt\":\"2099-09-18T14:30:00Z\",\"user\":"
                + user(role) + "}";
    }

    /** One user account. */
    public static String user(String role) {
        return "{\"nic\":\"199512345678\",\"fullName\":\"Kasun Perera\","
                + "\"email\":\"kasun@example.com\",\"phone\":\"0771234567\","
                + "\"role\":\"" + role + "\",\"status\":\"Active\","
                + "\"createdAt\":\"2026-08-01T04:00:00Z\"}";
    }

    /** The answer of POST api/checkin/verify. */
    public static String checkIn(boolean canComplete, String message) {
        return "{\"canComplete\":" + canComplete + ",\"message\":\"" + message + "\","
                + "\"prosumerPhone\":\"0771234567\","
                + "\"checkInOpensAt\":\"2026-09-18T02:15:00Z\","
                + "\"checkInClosesAt\":\"2026-09-18T04:30:00Z\","
                + "\"reservation\":" + reservation("Approved", null) + "}";
    }

    /** One booking, with the status and delivered energy the test needs. */
    public static String reservation(String status, Double deliveredKwh) {
        return "{\"id\":\"66eb1f2c9a2b4c0012ab34cd\",\"referenceNo\":\"RSV-260918-HURV8\","
                + "\"prosumerNic\":\"199512345678\",\"prosumerName\":\"Kasun Perera\","
                + "\"stationId\":\"66eb1f2c9a2b4c0012ab0001\",\"stationName\":\"Malabe Solar Hub\","
                + "\"slotId\":\"66eb1f2c9a2b4c0012ab0002\","
                + "\"startTime\":\"2026-09-18T02:30:00Z\",\"endTime\":\"2026-09-18T04:30:00Z\","
                + "\"tradeType\":\"Export\",\"energyKwh\":12.5,"
                + "\"deliveredKwh\":" + (deliveredKwh == null ? "null" : deliveredKwh) + ","
                + "\"status\":\"" + status + "\",\"createdBy\":\"199512345678\","
                + "\"createdAt\":\"2026-09-16T05:00:00Z\",\"updatedAt\":\"2026-09-16T05:00:00Z\","
                + "\"canModify\":false,\"modifyDeadline\":\"2026-09-17T14:30:00Z\","
                + "\"hasQrCode\":true,\"isPast\":false}";
    }

    /** The error body the API sends when a login is refused. */
    public static String problem(String title, int status, String detail) {
        return "{\"title\":\"" + title + "\",\"status\":" + status + ",\"detail\":\"" + detail + "\"}";
    }

    // ----- Malith: prosumer accounts and the dashboard -----

    /** A full prosumer profile, as GET and PUT api/prosumers/me send it. */
    public static String profile(String phone, String status) {
        return "{\"nic\":\"200034501234\",\"fullName\":\"Kasun Perera\","
                + "\"email\":\"kasun@example.com\",\"phone\":\"" + phone + "\","
                + "\"role\":\"Prosumer\",\"status\":\"" + status + "\","
                + "\"address\":\"No. 12, Temple Road, Malabe\",\"meterNumber\":\"CEB-MLB-10021\","
                + "\"solarCapacityKw\":5.5,\"createdAt\":\"2026-08-01T04:00:00Z\"}";
    }

    /** A validation answer that names one field, the way ASP.NET Core writes it. */
    public static String fieldProblem(String field, String message) {
        return "{\"title\":\"One or more validation errors occurred.\",\"status\":400,"
                + "\"errors\":{\"" + field + "\":[\"" + message + "\"]}}";
    }

    /**
     * The prosumer dashboard with two coming bookings. Their times are worked
     * out from now (3 hours and 1 day ahead), because the API only lists
     * bookings that have not started and the screenshots show "in 3 hours".
     */
    public static String dashboard() {
        Instant soon = Instant.now().truncatedTo(ChronoUnit.HOURS).plus(3, ChronoUnit.HOURS);
        Instant tomorrow = soon.plus(1, ChronoUnit.DAYS);
        return "{\"pendingCount\":2,\"approvedFutureCount\":3,\"completedCount\":7,"
                + "\"totalDeliveredKwh\":86.5,"
                + "\"nextReservation\":" + summary("RSV-260918-HURV8", "Malabe Solar Hub", "Approved", soon) + ","
                + "\"upcomingReservations\":["
                + summary("RSV-260918-HURV8", "Malabe Solar Hub", "Approved", soon) + ","
                + summary("RSV-260919-KDY42", "Kandy Lake Microgrid", "Pending", tomorrow) + "],"
                + "\"generatedAt\":\"" + Instant.now().truncatedTo(ChronoUnit.SECONDS) + "\"}";
    }

    /** The dashboard of a prosumer who has not booked anything yet. */
    public static String emptyDashboard() {
        return "{\"pendingCount\":0,\"approvedFutureCount\":0,\"completedCount\":0,"
                + "\"totalDeliveredKwh\":0,\"nextReservation\":null,\"upcomingReservations\":[],"
                + "\"generatedAt\":\"2026-09-18T02:00:00Z\"}";
    }

    // ----- Nimthara: stations and slots -----

    /** Three demo stations as the nearby search sends them, nearest first. */
    public static String nearbyStations() {
        return "[" + station("st-mal", "SSG-MAL-01", "SLIIT Malabe Campus Microgrid", "New Kandy Road, Malabe",
                6.9147, 79.9729, 12, 9, 50, "00:00", "24:00", 1.2) + ","
                + station("st-col", "SSG-COL-01", "Colombo Fort Solar Hub", "Olcott Mawatha, Colombo 01",
                6.9335, 79.8501, 20, 0, 50, "06:00", "20:00", 13.8) + ","
                + station("st-kan", "SSG-KAN-01", "Kandy Lakeside Energy Node", "Lake Road, Kandy",
                7.2926, 80.6413, 8, 5, 60, "06:00", "18:00", 86.4) + "]";
    }

    /** The Malabe station on its own, as GET api/stations/{id} and the bay update send it. */
    public static String malabeStation(int freeBays) {
        return station("st-mal", "SSG-MAL-01", "SLIIT Malabe Campus Microgrid", "New Kandy Road, Malabe",
                6.9147, 79.9729, 12, freeBays, 50, "00:00", "24:00", null);
    }

    /** Three slots of today at a station: one with bays, one full and one closed. */
    public static String slotsToday() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Colombo"));
        return "[" + slot("sl-1", today, 8, 5, 2, true) + ","
                + slot("sl-2", today, 10, 5, 5, true) + ","
                + slot("sl-3", today, 12, 5, 0, false) + "]";
    }

    // ----- Hamnad: bookings and QR codes -----

    /** The id of the sample booking, used in the addresses the tests answer. */
    public static final String BOOKING_ID = "bk-hurv8";

    /** The NIC of the signed-in test user, so the booking is "by you". */
    public static final String MY_NIC = "199512345678";

    /** The signed QR text the API sends for the sample booking. */
    public static final String QR_PAYLOAD = "SSG1.bk-hurv8.q7Hn2kLp9wXz.3fA9c1d2e4b5";

    /** The sample booking with the given status, its slot starting that many hours from now. */
    public static String booking(String status, long startsInHours) {
        return booking(BOOKING_ID, "RSV-260918-HURV8", status, startsInHours);
    }

    /**
     * One booking of the signed-in prosumer at the Malabe station, its slot
     * starting the given number of hours from now (negative for the past), on
     * a whole Sri Lankan hour like the real slots.
     */
    public static String booking(String id, String reference, String status, long startsInHours) {
        Instant start = ZonedDateTime.now(ZoneId.of("Asia/Colombo"))
                .truncatedTo(ChronoUnit.HOURS).plusHours(startsInHours).toInstant();
        return bookingAt(id, reference, status, start);
    }

    /** The sample booking in the two-hour slot that starts at the given Sri Lankan hour of a day. */
    public static String bookingInSlot(String status, LocalDate day, int hour) {
        Instant start = day.atTime(hour, 0).atZone(ZoneId.of("Asia/Colombo")).toInstant();
        return bookingAt(BOOKING_ID, "RSV-260918-HURV8", status, start);
    }

    /**
     * One booking starting at the given moment. The rule flags are worked out
     * the way the API does it: a change is allowed until 12 hours before the
     * start, and the booking is past once its slot has ended. The steps of its
     * history match the status.
     */
    private static String bookingAt(String id, String reference, String status, Instant start) {
        Instant now = Instant.now();
        Instant end = start.plus(2, ChronoUnit.HOURS);
        Instant created = start.minus(3, ChronoUnit.DAYS);
        boolean live = "Pending".equals(status) || "Approved".equals(status);
        boolean canModify = live && !start.minus(12, ChronoUnit.HOURS).isBefore(now);
        boolean isPast = !end.isAfter(now);

        StringBuilder steps = new StringBuilder();
        if ("Approved".equals(status) || "Completed".equals(status)) {
            steps.append(",\"approvedBy\":\"199001234567\",\"approvedAt\":\"")
                    .append(created.plus(2, ChronoUnit.HOURS)).append("\"");
        }
        if ("Completed".equals(status)) {
            steps.append(",\"completedBy\":\"199001234567\",\"completedAt\":\"")
                    .append(start.plus(90, ChronoUnit.MINUTES)).append("\",\"deliveredKwh\":12.0");
        }
        if ("Cancelled".equals(status)) {
            steps.append(",\"cancelledBy\":\"" + MY_NIC + "\",\"cancelledAt\":\"")
                    .append(created.plus(1, ChronoUnit.DAYS)).append("\",\"reason\":\"Plans changed\"");
        }
        if ("Rejected".equals(status)) {
            steps.append(",\"rejectedBy\":\"199001234567\",\"rejectedAt\":\"")
                    .append(created.plus(5, ChronoUnit.HOURS)).append("\",\"reason\":\"Station maintenance\"");
        }
        return "{\"id\":\"" + id + "\",\"referenceNo\":\"" + reference + "\","
                + "\"prosumerNic\":\"" + MY_NIC + "\",\"prosumerName\":\"Kasun Perera\","
                + "\"stationId\":\"st-mal\",\"stationName\":\"SLIIT Malabe Campus Microgrid\","
                + "\"slotId\":\"sl-" + id + "\","
                + "\"startTime\":\"" + start + "\",\"endTime\":\"" + end + "\","
                + "\"tradeType\":\"Export\",\"energyKwh\":12.5,"
                + "\"status\":\"" + status + "\",\"createdBy\":\"" + MY_NIC + "\","
                + "\"createdAt\":\"" + created + "\",\"updatedAt\":\"" + created + "\","
                + "\"canModify\":" + canModify + ",\"modifyDeadline\":\"" + start.minus(12, ChronoUnit.HOURS) + "\","
                + "\"hasQrCode\":" + ("Approved".equals(status)) + ",\"isPast\":" + isPast
                + steps + "}";
    }

    /** One page of the booking list, as GET api/reservations sends it. */
    public static String bookingPage(int total, int page, int totalPages, String... bookings) {
        return "{\"items\":[" + String.join(",", bookings) + "],\"total\":" + total + ","
                + "\"page\":" + page + ",\"pageSize\":20,\"totalPages\":" + totalPages + "}";
    }

    /** The QR answer of the sample booking. */
    public static String qrCode() {
        return "{\"reservationId\":\"" + BOOKING_ID + "\",\"referenceNo\":\"RSV-260918-HURV8\","
                + "\"stationName\":\"SLIIT Malabe Campus Microgrid\","
                + "\"startTime\":\"2026-09-20T02:30:00Z\",\"endTime\":\"2026-09-20T04:30:00Z\","
                + "\"payload\":\"" + QR_PAYLOAD + "\"}";
    }

    /** Free slots on a day at the Malabe station, as a prosumer gets them (open, with bays, not started). */
    public static String freeSlots(LocalDate day) {
        return "[" + slot("sl-1", day, 8, 5, 2, true) + ","
                + slot("sl-2", day, 10, 5, 4, true) + "]";
    }

    /** The staff numbers of GET api/dashboard/summary. */
    public static String staffDashboard() {
        return "{\"pendingReservations\":4,\"approvedFutureReservations\":9,\"todaysReservations\":3,"
                + "\"activeStations\":3,\"totalStations\":4,\"pendingActivations\":2,\"activeProsumers\":18,"
                + "\"upcomingReservations\":[],\"generatedAt\":\"2026-09-18T02:00:00Z\"}";
    }

    /** One station with the same hours every day of the week. */
    private static String station(String id, String code, String name, String address, double lat, double lng,
                                  int totalBays, int freeBays, double bayKwh, String open, String close,
                                  Double distanceKm) {
        StringBuilder week = new StringBuilder();
        String[] days = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"};
        for (int i = 0; i < days.length; i++) {
            week.append(i == 0 ? "" : ",").append("{\"day\":\"").append(days[i]).append("\",\"openTime\":\"")
                    .append(open).append("\",\"closeTime\":\"").append(close).append("\"}");
        }
        return "{\"id\":\"" + id + "\",\"code\":\"" + code + "\",\"name\":\"" + name + "\","
                + "\"address\":\"" + address + "\",\"latitude\":" + lat + ",\"longitude\":" + lng + ","
                + "\"solarCapacityKw\":150,\"storageCapacityKwh\":600,"
                + "\"totalBatterySlots\":" + totalBays + ",\"availableBatterySlots\":" + freeBays + ","
                + "\"bayCapacityKwh\":" + bayKwh + ",\"schedule\":[" + week + "],"
                + "\"status\":\"Active\",\"createdAt\":\"2026-08-01T04:00:00Z\",\"updatedAt\":\"2026-09-18T04:00:00Z\""
                + (distanceKm == null ? "" : ",\"distanceKm\":" + distanceKm) + "}";
    }

    /** A two-hour slot starting at the given Sri Lankan hour. */
    private static String slot(String id, LocalDate day, int hour, int capacity, int booked, boolean open) {
        Instant start = day.atTime(hour, 0).atZone(ZoneId.of("Asia/Colombo")).toInstant();
        return "{\"id\":\"" + id + "\",\"stationId\":\"st-mal\",\"startTime\":\"" + start + "\","
                + "\"endTime\":\"" + start.plus(2, ChronoUnit.HOURS) + "\",\"capacity\":" + capacity + ","
                + "\"bookedCount\":" + booked + ",\"availableBays\":" + (capacity - booked) + ","
                + "\"isOpen\":" + open + "}";
    }

    /** One short booking line of the dashboard: a two-hour slot from the given start. */
    private static String summary(String reference, String station, String status, Instant start) {
        return "{\"id\":\"66eb1f2c9a2b4c0012ab34cd\",\"referenceNo\":\"" + reference + "\","
                + "\"prosumerNic\":\"200034501234\",\"prosumerName\":\"Kasun Perera\","
                + "\"stationName\":\"" + station + "\","
                + "\"startTime\":\"" + start + "\",\"endTime\":\"" + start.plus(2, ChronoUnit.HOURS) + "\","
                + "\"tradeType\":\"Export\",\"energyKwh\":12.5,\"status\":\"" + status + "\"}";
    }
}
