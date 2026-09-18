/*
 * File:    OpeningHours.java
 * Module:  Stations
 * Owner:   Nimthara
 * Purpose: Turns the weekly schedule of a station into the lines the screens
 *          show: the hours of today on the map card, and all seven days on the
 *          station page, with "Closed" for the days that are missing.
 */
package lk.sliit.solargrid.util;

import androidx.annotation.Nullable;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import lk.sliit.solargrid.data.remote.dto.StationDto;

public final class OpeningHours {

    /** One line of the week: the day and its hours, or null hours when closed. */
    public static final class Line {

        public final DayOfWeek day;
        public final String dayName;

        /** "06:00 - 18:00", "Open all day", or null when closed. */
        @Nullable
        public final String hours;

        /** Keeps the day and its hours together. */
        Line(DayOfWeek day, @Nullable String hours) {
            this.day = day;
            this.dayName = day.getDisplayName(TextStyle.FULL, Locale.UK);
            this.hours = hours;
        }
    }

    /** Nobody builds this class; it is only a set of helpers. */
    private OpeningHours() {
    }

    /** Monday to Sunday, each with its hours or closed. */
    public static List<Line> week(@Nullable List<StationDto.OpeningHoursDto> schedule) {
        List<Line> lines = new ArrayList<>();
        for (DayOfWeek day : DayOfWeek.values()) {
            lines.add(new Line(day, hoursOn(schedule, day)));
        }
        return lines;
    }

    /** The hours of the given date, or null when the station is closed that day. */
    @Nullable
    public static String on(@Nullable List<StationDto.OpeningHoursDto> schedule, LocalDate date) {
        return hoursOn(schedule, date.getDayOfWeek());
    }

    /** Finds the day in the schedule and writes its hours. */
    @Nullable
    private static String hoursOn(@Nullable List<StationDto.OpeningHoursDto> schedule, DayOfWeek day) {
        if (schedule == null) {
            return null;
        }
        String name = day.getDisplayName(TextStyle.FULL, Locale.ENGLISH);
        for (StationDto.OpeningHoursDto entry : schedule) {
            if (name.equalsIgnoreCase(entry.day)) {
                boolean allDay = "00:00".equals(entry.openTime)
                        && ("24:00".equals(entry.closeTime) || "23:59".equals(entry.closeTime));
                return allDay ? "Open all day" : entry.openTime + " - " + entry.closeTime;
            }
        }
        return null;
    }
}
