/*
 * File:    Places.java
 * Module:  Stations
 * Owner:   Nimthara
 * Purpose: Where the map starts. All the stations are in Sri Lanka, so when
 *          the phone location is unknown or somewhere else (an emulator starts
 *          in California), the map starts in Colombo instead.
 */
package lk.sliit.solargrid.util;

import androidx.annotation.Nullable;

import com.google.android.gms.maps.model.LatLng;

public final class Places {

    /** Colombo Fort, the middle of the capital. */
    public static final LatLng COLOMBO = new LatLng(6.9271, 79.8612);

    /** Nobody builds this class; it is only a set of helpers. */
    private Places() {
    }

    /** True when the place lies inside a box drawn around Sri Lanka. */
    public static boolean isInSriLanka(@Nullable LatLng place) {
        return place != null
                && place.latitude >= 5.8 && place.latitude <= 9.9
                && place.longitude >= 79.5 && place.longitude <= 82.0;
    }

    /** The place to centre the map on: the phone when it is in Sri Lanka, otherwise Colombo. */
    public static LatLng startingPoint(@Nullable LatLng phone) {
        return isInSriLanka(phone) ? phone : COLOMBO;
    }
}
