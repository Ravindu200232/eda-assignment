/*
 * File:    OpeningHoursTest.java
 * Module:  Tests
 * Owner:   Nimthara
 * Purpose: Checks how a station schedule is written: the seven days in order,
 *          closed days, stations that never close, and where the map starts.
 */
package lk.sliit.solargrid.util;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import com.google.android.gms.maps.model.LatLng;

import org.junit.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

import lk.sliit.solargrid.data.remote.dto.StationDto;

public class OpeningHoursTest {

    /** The week always has seven lines, Monday first. */
    @Test
    public void writesTheWholeWeek() {
        List<OpeningHours.Line> week = OpeningHours.week(List.of(hours("Monday", "06:00", "18:00")));

        assertEquals(7, week.size());
        assertEquals(DayOfWeek.MONDAY, week.get(0).day);
        assertEquals("06:00 - 18:00", week.get(0).hours);
    }

    /** A day missing from the schedule is a closed day. */
    @Test
    public void marksMissingDaysAsClosed() {
        List<OpeningHours.Line> week = OpeningHours.week(List.of(hours("Monday", "06:00", "18:00")));

        assertNull(week.get(6).hours);
        assertEquals("Sunday", week.get(6).dayName);
    }

    /** A station open from 00:00 to 24:00 is written as open all day. */
    @Test
    public void writesAllDayOpening() {
        LocalDate friday = LocalDate.of(2026, 9, 18);

        assertEquals("Open all day", OpeningHours.on(List.of(hours("Friday", "00:00", "24:00")), friday));
    }

    /** Places inside Sri Lanka are used; others fall back to Colombo. */
    @Test
    public void startsTheMapInSriLanka() {
        LatLng malabe = new LatLng(6.9147, 79.9729);
        LatLng mountainView = new LatLng(37.422, -122.084);

        assertTrue(Places.isInSriLanka(malabe));
        assertFalse(Places.isInSriLanka(mountainView));
        assertEquals(malabe, Places.startingPoint(malabe));
        assertEquals(Places.COLOMBO, Places.startingPoint(mountainView));
        assertEquals(Places.COLOMBO, Places.startingPoint(null));
    }

    /** One day of a schedule. */
    private static StationDto.OpeningHoursDto hours(String day, String open, String close) {
        StationDto.OpeningHoursDto entry = new StationDto.OpeningHoursDto();
        entry.day = day;
        entry.openTime = open;
        entry.closeTime = close;
        return entry;
    }
}
