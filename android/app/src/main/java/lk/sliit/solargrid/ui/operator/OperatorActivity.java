/*
 * File:    OperatorActivity.java
 * Module:  Operator shell
 * Owner:   Ravindu
 * Purpose: The home of a Grid Operator: scan a booking QR code, look at the
 *          bookings of the day, keep the battery bay count up to date and see
 *          the account.
 * Source:  AND-10 (Material bottom navigation with fragments),
 *          AND-35 (coming back to the open shell, added by Hamnad).
 */
package lk.sliit.solargrid.ui.operator;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;

import lk.sliit.solargrid.R;
import lk.sliit.solargrid.databinding.ActivityOperatorBinding;
import lk.sliit.solargrid.ui.common.AccountFragment;
import lk.sliit.solargrid.ui.common.BaseActivity;
import lk.sliit.solargrid.ui.common.PlaceholderFragment;

public class OperatorActivity extends BaseActivity {

    private static final String EXTRA_TAB = "tab";

    private ActivityOperatorBinding binding;
    private boolean newIntentWaiting;

    /**
     * Opens (or brings back) the operator home on one tab, for example the
     * "Today" list after a booking was cancelled for a prosumer (added by Hamnad).
     */
    public static Intent openTab(Context context, int tabId) {
        return new Intent(context, OperatorActivity.class).putExtra(EXTRA_TAB, tabId);
    }

    /** Builds the shell and opens the Scan tab. */
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (!sessions().isSignedIn()) {
            goToLogin(getString(R.string.session_expired));
            return;
        }

        binding = ActivityOperatorBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        leaveRoomForSystemBars(binding.getRoot());

        binding.bottomNav.setOnItemSelectedListener(item -> {
            showTab(item.getItemId());
            return true;
        });

        if (savedInstanceState == null) {
            binding.bottomNav.setSelectedItemId(getIntent().getIntExtra(EXTRA_TAB, R.id.tab_scan));
        }
    }

    /** Another screen sent the operator back here; the tab is chosen once the screen is back. */
    @Override
    protected void onNewIntent(@NonNull Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        newIntentWaiting = true;
    }

    /** Opens the tab the other screen asked for. */
    @Override
    protected void onResume() {
        super.onResume();
        if (newIntentWaiting && binding != null) {
            newIntentWaiting = false;
            int tab = getIntent().getIntExtra(EXTRA_TAB, 0);
            if (tab != 0) {
                binding.bottomNav.setSelectedItemId(tab);
            }
        }
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
        if (itemId == R.id.tab_today) {
            // Hamnad: the bookings of this station today.
            return PlaceholderFragment.of(R.string.operator_today_screen);
        }
        if (itemId == R.id.tab_bays) {
            // Nimthara: the battery bay counter.
            return new BaysFragment();
        }
        if (itemId == R.id.tab_account) {
            return new AccountFragment();
        }
        return new ScanFragment();
    }
}
