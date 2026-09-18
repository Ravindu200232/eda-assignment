/*
 * File:    LocalNetwork.java
 * Module:  Core
 * Owner:   Ravindu
 * Purpose: From Android 17 an app may only reach a server on the local network
 *          (a home or campus Wi-Fi, or the computer that runs the emulator at
 *          10.0.2.2) after the user allows it. During development and in the
 *          demo the Web API lives on such an address, so the app asks for this
 *          permission before its first request. A server on the internet, or
 *          one on the phone itself, needs nothing.
 * Source:  AND-23 (Android local network permission).
 */
package lk.sliit.solargrid.util;

import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;

public final class LocalNetwork {

    /** The permission Android 17 asks for, shown to the user as "Nearby devices". */
    public static final String PERMISSION = "android.permission.ACCESS_LOCAL_NETWORK";

    /** The first Android version that blocks the local network by default. */
    private static final int ANDROID_17 = 37;

    /** Nobody builds this class; it is only a set of helpers. */
    private LocalNetwork() {
    }

    /** True when the app must ask before it can reach the server at this address. */
    public static boolean needsPermission(Context context, String baseUrl) {
        if (Build.VERSION.SDK_INT < ANDROID_17 || !isOnLocalNetwork(baseUrl)) {
            return false;
        }
        return ContextCompat.checkSelfPermission(context, PERMISSION) != PackageManager.PERMISSION_GRANTED;
    }

    /**
     * True for the private address ranges Android treats as the local network:
     * 10.x, 172.16.x to 172.31.x, 192.168.x, 169.254.x, the IPv6 private and
     * link-local ranges, and ".local" names. The phone itself (localhost,
     * 127.x) does not count.
     */
    public static boolean isOnLocalNetwork(@Nullable String baseUrl) {
        String host = hostOf(baseUrl);
        if (host == null) {
            return false;
        }
        if (host.endsWith(".local")) {
            return true;
        }
        if (host.contains(":")) {
            return host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe8")
                    || host.startsWith("fe9") || host.startsWith("fea") || host.startsWith("feb");
        }

        String[] parts = host.split("\\.");
        if (parts.length != 4) {
            return false;
        }
        try {
            int first = Integer.parseInt(parts[0]);
            int second = Integer.parseInt(parts[1]);
            return first == 10
                    || (first == 172 && second >= 16 && second <= 31)
                    || (first == 192 && second == 168)
                    || (first == 169 && second == 254);
        } catch (NumberFormatException notAnAddress) {
            // A name such as api.example.com, which the internet resolves.
            return false;
        }
    }

    /** The host part of an address in lower case, without IPv6 brackets. */
    @Nullable
    private static String hostOf(@Nullable String baseUrl) {
        if (baseUrl == null) {
            return null;
        }
        try {
            String host = new URI(baseUrl.trim()).getHost();
            if (host == null) {
                return null;
            }
            host = host.toLowerCase(Locale.ROOT);
            if (host.startsWith("[") && host.endsWith("]")) {
                host = host.substring(1, host.length() - 1);
            }
            return host;
        } catch (URISyntaxException badAddress) {
            return null;
        }
    }
}
