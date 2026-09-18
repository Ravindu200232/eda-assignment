/*
 * File:    MainActivity.java
 * Module:  Prosumer shell
 * Owner:   Ravindu
 * Purpose: The home of a prosumer: four tabs at the bottom and one screen at a
 *          time above them. Each member plugs their own screen into the tab
 *          they own, by changing one line in fragmentFor().
 * Source:  AND-10 (Material bottom navigation with fragments).
 */
package lk.sliit.solargrid.ui.prosumer;

import android.os.Bundle;

import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;

import lk.sliit.solargrid.R;
import lk.sliit.solargrid.databinding.ActivityMainBinding;
import lk.sliit.solargrid.ui.common.AccountFragment;
import lk.sliit.solargrid.ui.common.BaseActivity;
import lk.sliit.solargrid.ui.common.PlaceholderFragment;

public class MainActivity extends BaseActivity {

    private ActivityMainBinding binding;

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
            binding.bottomNav.setSelectedItemId(R.id.tab_home);
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
            return PlaceholderFragment.of(R.string.map_screen);
        }
        if (itemId == R.id.tab_bookings) {
            // Hamnad: the booking list and the booking form.
            return PlaceholderFragment.of(R.string.bookings_screen);
        }
        if (itemId == R.id.tab_account) {
            return new AccountFragment();
        }
        // Malith: the dashboard with the booking counts.
        return new HomeFragment();
    }
}
