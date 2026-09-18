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

    /** One short booking line of the dashboard: a two-hour slot from the given start. */
    private static String summary(String reference, String station, String status, Instant start) {
        return "{\"id\":\"66eb1f2c9a2b4c0012ab34cd\",\"referenceNo\":\"" + reference + "\","
                + "\"prosumerNic\":\"200034501234\",\"prosumerName\":\"Kasun Perera\","
                + "\"stationName\":\"" + station + "\","
                + "\"startTime\":\"" + start + "\",\"endTime\":\"" + start.plus(2, ChronoUnit.HOURS) + "\","
                + "\"tradeType\":\"Export\",\"energyKwh\":12.5,\"status\":\"" + status + "\"}";
    }
}
