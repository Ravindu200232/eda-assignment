/*
 * File:    PlaceholderFragment.java
 * Module:  Shared screens
 * Owner:   Ravindu
 * Purpose: Fills a tab whose screen another member is still building, so the
 *          app runs end to end from the first day. When the real screen lands,
 *          the one line that creates this fragment is replaced.
 */
package lk.sliit.solargrid.ui.common;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.StringRes;
import androidx.fragment.app.Fragment;

import lk.sliit.solargrid.R;
import lk.sliit.solargrid.databinding.FragmentPlaceholderBinding;

public class PlaceholderFragment extends Fragment {

    private static final String ARG_SCREEN_NAME = "screenName";

    /** Makes a placeholder that names the screen that is coming. */
    public static PlaceholderFragment of(@StringRes int screenNameRes) {
        PlaceholderFragment fragment = new PlaceholderFragment();
        Bundle arguments = new Bundle();
        arguments.putInt(ARG_SCREEN_NAME, screenNameRes);
        fragment.setArguments(arguments);
        return fragment;
    }

    /** Builds the card and writes the sentence for this tab. */
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        FragmentPlaceholderBinding binding = FragmentPlaceholderBinding.inflate(inflater, container, false);

        int screenNameRes = requireArguments().getInt(ARG_SCREEN_NAME);
        binding.placeholderMessage.setText(getString(R.string.placeholder_message, getString(screenNameRes)));

        return binding.getRoot();
    }
}
