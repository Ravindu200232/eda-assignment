/*
 * File:    LocationFinder.java
 * Module:  Stations
 * Owner:   Nimthara
 * Purpose: Finds where the phone is, once, for the map of nearby stations. The
 *          app uses the fused location provider of Google Play services; the
 *          tests swap in a fixed place, so they never depend on a real GPS.
 * Source:  AND-28 (fused location provider).
 */
package lk.sliit.solargrid.util;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.pm.PackageManager;

import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;

import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.google.android.gms.maps.model.LatLng;
import com.google.android.gms.tasks.CancellationTokenSource;

public interface LocationFinder {

    /** Told where the phone is. */
    interface Answer {

        /** The place, or null when it is not allowed or not known. */
        void onFound(@Nullable LatLng place);
    }

    /** Looks up the place of the phone once. */
    void find(Context context, Answer answer);

    /** True when the user allowed the app to know where the phone is. */
    static boolean isAllowed(Context context) {
        return ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED
                || ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
    }

    /** The real finder, based on the fused location provider. */
    class Fused implements LocationFinder {

        /** Asks Play services for one fresh, battery-friendly fix. */
        @SuppressLint("MissingPermission") // Checked with isAllowed() just before.
        @Override
        public void find(Context context, Answer answer) {
            if (!isAllowed(context)) {
                answer.onFound(null);
                return;
            }
            CancellationTokenSource cancel = new CancellationTokenSource();
            LocationServices.getFusedLocationProviderClient(context)
                    .getCurrentLocation(Priority.PRIORITY_BALANCED_POWER_ACCURACY, cancel.getToken())
                    .addOnSuccessListener(location -> answer.onFound(location == null
                            ? null
                            : new LatLng(location.getLatitude(), location.getLongitude())))
                    .addOnFailureListener(problem -> answer.onFound(null));
        }
    }
}
