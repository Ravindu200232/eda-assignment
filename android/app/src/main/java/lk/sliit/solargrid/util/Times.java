/*
 * File:    Times.java
 * Module:  Core
 * Owner:   Ravindu
 * Purpose: Reads the UTC times the Web API sends and writes them back as Sri
 *          Lankan local time. Every screen formats dates through this class,
 *          so the app looks the same everywhere.
 * Source:  AND-20 (java.time on Android).
 */
package lk.sliit.solargrid.util;

import androidx.annotation.Nullable;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.Locale;

public final class Times {

    /** All times are shown in Sri Lankan time, whatever the phone is set to. */
    public static final ZoneId ZONE = ZoneId.of("Asia/Colombo");

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("EEE, d MMM yyyy", Locale.UK);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm", Locale.UK);
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("EEE, d MMM yyyy HH:mm", Locale.UK);
    private static final DateTimeFormatter DAY_CHIP = DateTimeFormatter.ofPattern("EEE d MMM", Locale.UK);
    private static final DateTimeFormatter ISO_DAY = DateTimeFormatter.ofPattern("yyyy-MM-dd", Locale.UK);

    /** Nobody builds this class; it is only a set of helpers. */
    private Times() {
    }

    /**
     * Turns an API date into an instant. The API usually ends the text with
     * "Z", but a few fields come without it, and those are UTC as well.
     * Returns null when the text is missing or cannot be read.
     */
    @Nullable
    public static Instant toInstant(@Nullable String isoText) {
        if (isoText == null || isoText.trim().isEmpty()) {
            return null;
        }
        String text = isoText.trim();
        try {
            return Instant.parse(text);
        } catch (DateTimeParseException ignored) {
            // Falls through to the form without a "Z" at the end.
        }
        try {
            return LocalDateTime.parse(text).toInstant(ZoneOffset.UTC);
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    /** The same moment in Sri Lankan time, or null when it cannot be read. */
    @Nullable
    public static ZonedDateTime local(@Nullable String isoText) {
        Instant instant = toInstant(isoText);
        return instant == null ? null : instant.atZone(ZONE);
    }

    /** The current moment as the API writes it, for example 2026-09-18T06:30:00Z. */
    public static String nowIso() {
        return DateTimeFormatter.ISO_INSTANT.format(Instant.now().truncatedTo(ChronoUnit.SECONDS));
    }

    /** The date today in Sri Lanka. */
    public static LocalDate today() {
        return LocalDate.now(ZONE);
    }

    /** A date for the day filters of the API, for example 2026-09-18. */
    public static String isoDay(LocalDate day) {
        return ISO_DAY.format(day);
    }

    /** "Thu, 18 Sept 2026" - used above lists and on details pages. */
    public static String date(@Nullable String isoText) {
        ZonedDateTime moment = local(isoText);
        return moment == null ? "" : DATE.format(moment);
    }

    /** "08:00" - the clock time of a slot. */
    public static String time(@Nullable String isoText) {
        ZonedDateTime moment = local(isoText);
        return moment == null ? "" : TIME.format(moment);
    }

    /** "Thu, 18 Sept 2026 15:30" - a single moment with its date. */
    public static String dateTime(@Nullable String isoText) {
        ZonedDateTime moment = local(isoText);
        return moment == null ? "" : DATE_TIME.format(moment);
    }

    /** "08:00 - 10:00" - the hours of a booked slot. */
    public static String timeRange(@Nullable String startIso, @Nullable String endIso) {
        String start = time(startIso);
        String end = time(endIso);
        if (start.isEmpty() || end.isEmpty()) {
            return start + end;
        }
        return start + " - " + end;
    }

    /** "Thu, 18 Sept 2026, 08:00 - 10:00" - the whole slot on one line. */
    public static String slot(@Nullable String startIso, @Nullable String endIso) {
        String day = date(startIso);
        String hours = timeRange(startIso, endIso);
        if (day.isEmpty()) {
            return hours;
        }
        return hours.isEmpty() ? day : day + ", " + hours;
    }

    /** "Thu 18 Sept" - the short label on the day buttons of the booking wizard. */
    public static String dayChip(LocalDate day) {
        return DAY_CHIP.format(day);
    }

    /** The Sri Lankan calendar day of an API time, used to group slots. */
    @Nullable
    public static LocalDate dayOf(@Nullable String isoText) {
        ZonedDateTime moment = local(isoText);
        return moment == null ? null : moment.toLocalDate();
    }

    /**
     * A short "how far away" sentence, such as "in 3 hours" or "2 days ago".
     * Booking lists use it next to the slot time.
     */
    public static String humanGap(@Nullable String isoText, Instant now) {
        Instant moment = toInstant(isoText);
        if (moment == null) {
            return "";
        }
        long minutes = ChronoUnit.MINUTES.between(now, moment);
        boolean future = minutes >= 0;
        long size = Math.abs(minutes);

        String amount;
        if (size < 1) {
            return "now";
        } else if (size < 60) {
            amount = plural(size, "minute");
        } else if (size < 60 * 24) {
            amount = plural(size / 60, "hour");
        } else {
            amount = plural(size / (60 * 24), "day");
        }
        return future ? "in " + amount : amount + " ago";
    }

    /** "1 hour" or "3 hours" - keeps the sentences above readable. */
    private static String plural(long count, String word) {
        return count + " " + word + (count == 1 ? "" : "s");
    }
}
