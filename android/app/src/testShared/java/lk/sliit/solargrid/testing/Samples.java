/*
 * File:    Samples.java
 * Module:  Tests
 * Owner:   Ravindu
 * Purpose: The JSON the tests answer with. Every piece was copied from the
 *          running Web API and only the names and dates were changed, so the
 *          tests keep matching what the app really receives.
 */
package lk.sliit.solargrid.testing;

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
}
