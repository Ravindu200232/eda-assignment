/*
 * File:    TimesTest.java
 * Module:  Tests
 * Owner:   Ravindu
 * Purpose: Checks that API times are read correctly and shown in Sri Lankan
 *          time. Getting this wrong would move every booking by 5.5 hours.
 */
package lk.sliit.solargrid.util;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

import java.time.Instant;
import java.time.LocalDate;

public class TimesTest {

    /** A UTC time with a Z at the end is read as it is. */
    @Test
    public void readsTheUsualApiTime() {
        Instant moment = Times.toInstant("2026-09-18T02:30:00Z");
        assertEquals(Instant.parse("2026-09-18T02:30:00Z"), moment);
    }

    /** The API sometimes leaves out the Z; that text is UTC as well. */
    @Test
    public void readsATimeWithoutTheZ() {
        Instant moment = Times.toInstant("2026-09-18T02:30:00");
        assertEquals(Instant.parse("2026-09-18T02:30:00Z"), moment);
    }

    /** Fractions of a second do not stop the reading. */
    @Test
    public void readsATimeWithFractions() {
        Instant moment = Times.toInstant("2026-09-18T02:30:00.1234567Z");
        assertEquals(Instant.parse("2026-09-18T02:30:00.1234567Z"), moment);
    }

    /** Missing or broken text gives nothing instead of an error. */
    @Test
    public void returnsNothingForTextItCannotRead() {
        assertNull(Times.toInstant(null));
        assertNull(Times.toInstant(""));
        assertNull(Times.toInstant("not a date"));
    }

    /** 02:30 UTC is half past eight in the morning in Sri Lanka. */
    @Test
    public void showsSriLankanTime() {
        assertEquals("08:00", Times.time("2026-09-18T02:30:00Z"));
    }

    /** A slot is written as one line with its date and hours. */
    @Test
    public void writesTheWholeSlotOnOneLine() {
        String text = Times.slot("2026-09-18T02:30:00Z", "2026-09-18T04:30:00Z");
        assertTrue(text, text.startsWith("Fri, 18 Sep"));
        assertTrue(text, text.endsWith("08:00 - 10:00"));
    }

    /** Times just after midnight UTC still belong to the same local day. */
    @Test
    public void groupsSlotsByTheSriLankanDay() {
        assertEquals(LocalDate.of(2026, 9, 18), Times.dayOf("2026-09-17T20:00:00Z"));
    }

    /** The gap is written the way a person would say it. */
    @Test
    public void writesTheGapInWords() {
        Instant now = Instant.parse("2026-09-18T02:30:00Z");
        assertEquals("in 3 hours", Times.humanGap("2026-09-18T05:30:00Z", now));
        assertEquals("2 days ago", Times.humanGap("2026-09-16T02:30:00Z", now));
        assertEquals("in 1 minute", Times.humanGap("2026-09-18T02:31:00Z", now));
    }

    /** An empty gap is written for text that cannot be read. */
    @Test
    public void writesNothingWhenThereIsNoTime() {
        assertEquals("", Times.humanGap(null, Instant.now()));
    }
}
