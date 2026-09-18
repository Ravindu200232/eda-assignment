/*
 * File:    StationTexts.java
 * Module:  Stations
 * Owner:   Nimthara
 * Purpose: The words every station screen uses: where the station is and how
 *          far, how many bays are free (as a coloured chip), how much energy
 *          one booking may use and the hours of today. One place, so the map
 *          card, the list and the station page always agree.
 */
package lk.sliit.solargrid.ui.map;

import android.content.Context;
import android.content.res.ColorStateList;
import android.widget.TextView;

import androidx.core.content.ContextCompat;

import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.remote.dto.StationDto;
import lk.sliit.solargrid.util.OpeningHours;
import lk.sliit.solargrid.util.Texts;
import lk.sliit.solargrid.util.Times;

public final class StationTexts {

    /** Nobody builds this class; it is only a set of helpers. */
    private StationTexts() {
    }

    /** "New Kandy Road, Malabe · 1.2 km away", or only the address when the distance is unknown. */
    public static String where(Context context, StationDto station) {
        String address = Texts.orDash(station.address);
        if (station.distanceKm == null) {
            return address;
        }
        return context.getString(R.string.station_where, address, Texts.number(station.distanceKm));
    }

    /** "Up to 50 kWh per booking". */
    public static String energy(Context context, StationDto station) {
        return context.getString(R.string.station_energy, Texts.number(station.bayCapacityKwh));
    }

    /** "Today: 06:00 - 20:00" or "Closed today". */
    public static String todayHours(Context context, StationDto station) {
        String hours = OpeningHours.on(station.schedule, Times.today());
        return hours == null
                ? context.getString(R.string.station_closed_today)
                : context.getString(R.string.station_today, hours);
    }

    /** Writes the free bays into a chip: green with bays, amber when full, grey when closed. */
    public static void paintBays(TextView chip, StationDto station) {
        Context context = chip.getContext();
        int background;
        int text;
        if (!"Active".equals(station.status)) {
            chip.setText(R.string.station_inactive);
            background = R.color.chip_neutral_bg;
            text = R.color.chip_neutral_text;
        } else if (station.availableBatterySlots <= 0) {
            chip.setText(R.string.station_full);
            background = R.color.chip_warning_bg;
            text = R.color.chip_warning_text;
        } else {
            // "bay" or "bays" follows the size of the station, as in "1 of 1 bay free".
            chip.setText(context.getResources().getQuantityString(R.plurals.station_bays_free,
                    station.totalBatterySlots, station.availableBatterySlots, station.totalBatterySlots));
            background = R.color.chip_success_bg;
            text = R.color.chip_success_text;
        }
        chip.setBackgroundTintList(ColorStateList.valueOf(ContextCompat.getColor(context, background)));
        chip.setTextColor(ContextCompat.getColor(context, text));
    }
}
