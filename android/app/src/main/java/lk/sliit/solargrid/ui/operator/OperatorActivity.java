/*
 * File:    OperatorActivity.java
 * Module:  Operator shell
 * Owner:   Ravindu
 * Purpose: The home of a Grid Operator: scan a booking QR code, look at the
 *          bookings of the day, keep the battery bay count up to date and see
 *          the account.
 * Source:  AND-10 (Material bottom navigation with fragments).
 */
package lk.sliit.solargrid.ui.operator;

import android.os.Bundle;

import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;

import lk.sliit.solargrid.R;
import lk.sliit.solargrid.databinding.ActivityOperatorBinding;
import lk.sliit.solargrid.ui.common.AccountFragment;
import lk.sliit.solargrid.ui.common.BaseActivity;
import lk.sliit.solargrid.ui.common.PlaceholderFragment;

public class OperatorActivity extends BaseActivity {

    private ActivityOperatorBinding binding;

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
            binding.bottomNav.setSelectedItemId(R.id.tab_scan);
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
