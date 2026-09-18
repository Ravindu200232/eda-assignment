/*
 * File:    MainActivity.java
 * Module:  Prosumer shell
 * Owner:   Ravindu
 * Purpose: The home of a prosumer: four tabs at the bottom and one screen at a
 *          time above them. Each member plugs their own screen into the tab
 *          they own, by changing one line in fragmentFor().
 * Source:  AND-10 (Material bottom navigation with fragments),
 *          AND-35 (coming back to the open shell, added by Hamnad).
 */
package lk.sliit.solargrid.ui.prosumer;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;

import lk.sliit.solargrid.R;
import lk.sliit.solargrid.databinding.ActivityMainBinding;
import lk.sliit.solargrid.ui.booking.BookingsFragment;
import lk.sliit.solargrid.ui.common.AccountFragment;
import lk.sliit.solargrid.ui.common.BaseActivity;
import lk.sliit.solargrid.ui.map.StationsFragment;

public class MainActivity extends BaseActivity {

    private static final String EXTRA_BOOKINGS_SCOPE = "bookingsScope";

    private ActivityMainBinding binding;

    /** The booking list tab to open next, set by openBookings(). */
    @Nullable
    private String bookingsScope;
    private boolean newIntentWaiting;

    /**
     * Opens (or brings back) the Bookings tab on one of its lists, for example
     * the waiting list after a new booking (added by Hamnad).
     */
    public static Intent openBookings(Context context, String scope) {
        return new Intent(context, MainActivity.class).putExtra(EXTRA_BOOKINGS_SCOPE, scope);
    }

    /** Builds the shell and opens the Home tab. */
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (!sessions().isSignedIn()) {
            goToLogin(getString(R.string.session_expired));
            return;
        }

        binding = ActivityMainBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        leaveRoomForSystemBars(binding.getRoot());

        binding.bottomNav.setOnItemSelectedListener(item -> {
            showTab(item.getItemId());
            return true;
        });

        if (savedInstanceState == null) {
            bookingsScope = getIntent().getStringExtra(EXTRA_BOOKINGS_SCOPE);
            binding.bottomNav.setSelectedItemId(bookingsScope == null ? R.id.tab_home : R.id.tab_bookings);
        }
    }

    /** A summary screen sent the prosumer back here; the tab is chosen once the screen is back. */
    @Override
    protected void onNewIntent(@NonNull Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        newIntentWaiting = true;
    }

    /** Opens the booking list the summary screen asked for. */
    @Override
    protected void onResume() {
        super.onResume();
        if (!newIntentWaiting || binding == null) {
            return;
        }
        newIntentWaiting = false;
        String scope = getIntent().getStringExtra(EXTRA_BOOKINGS_SCOPE);
        if (scope == null) {
            return;
        }
        Fragment current = getSupportFragmentManager().findFragmentById(R.id.tab_content);
        if (current instanceof BookingsFragment) {
            ((BookingsFragment) current).showScope(scope);
        } else {
            bookingsScope = scope;
            binding.bottomNav.setSelectedItemId(R.id.tab_bookings);
        }
    }

    /** Selects a tab from inside another screen, for example "Book a slot" on Home. */
    public void openTab(int itemId) {
        binding.bottomNav.setSelectedItemId(itemId);
    }

    /** Puts the screen of the chosen tab on top, unless it is already there. */
    private void showTab(int itemId) {
        FragmentManager manager = getSupportFragmentManager();
        String tag = "tab:" + itemId;
        Fragment current = manager.findFragmentById(R.id.tab_content);
        if (current != null && tag.equals(current.getTag())) {
            return;
        }
        manager.beginTransaction()
                .replace(R.id.tab_content, fragmentFor(itemId), tag)
                .commit();
    }

    /** The screen behind each tab. */
    private Fragment fragmentFor(int itemId) {
        if (itemId == R.id.tab_map) {
            // Nimthara: the nearby stations map.
            return new StationsFragment();
        }
        if (itemId == R.id.tab_bookings) {
            // Hamnad: the booking lists; the form opens from there.
            String scope = bookingsScope;
            bookingsScope = null;
            return BookingsFragment.showing(scope);
        }
        if (itemId == R.id.tab_account) {
            return new AccountFragment();
        }
        // Malith: the dashboard with the booking counts.
        return new HomeFragment();
    }
}
