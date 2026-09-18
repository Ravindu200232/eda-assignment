/*
 * File:    BaysFragment.java
 * Module:  Stations
 * Owner:   Nimthara
 * Purpose: The operator Bays tab. When a battery bay breaks or is repaired,
 *          the operator sets how many bays are free, so prosumers can only
 *          book bays that work. The API checks the number against the size of
 *          the station; the chosen station is remembered for next time.
 */
package lk.sliit.solargrid.ui.operator;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import java.util.ArrayList;
import java.util.List;

import lk.sliit.solargrid.AppContainer;
import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.remote.ApiCallback;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.data.remote.dto.StationDto;
import lk.sliit.solargrid.data.repo.CachedCallback;
import lk.sliit.solargrid.databinding.FragmentBaysBinding;
import lk.sliit.solargrid.ui.common.BaseActivity;
import lk.sliit.solargrid.ui.common.Notices;

public class BaysFragment extends Fragment {

    private static final String PREFERENCES = "operator";
    private static final String LAST_STATION = "baysStationId";

    private FragmentBaysBinding binding;
    private final List<StationDto> stations = new ArrayList<>();
    private StationDto chosen;
    private int freeBays;

    /** Builds the tab and loads the stations. */
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        binding = FragmentBaysBinding.inflate(inflater, container, false);

        binding.baysStation.setOnItemClickListener((parent, view, position, id) -> choose(stations.get(position)));
        binding.baysMinus.setOnClickListener(view -> change(-1));
        binding.baysPlus.setOnClickListener(view -> change(+1));
        binding.baysSave.setOnClickListener(view -> save());

        showCounter();
        loadStations();
        return binding.getRoot();
    }

    /** Loads every station the operator may look after. */
    private void loadStations() {
        setBusy(true);
        AppContainer.get().stations().search(null, new CachedCallback<List<StationDto>>() {

            /** Fills the station list and picks the one used last time. */
            @Override
            public void onResult(List<StationDto> result, @Nullable ApiError offlineReason) {
                if (binding == null) {
                    return;
                }
                setBusy(false);
                stations.clear();
                stations.addAll(result);
                List<String> names = new ArrayList<>();
                for (StationDto station : stations) {
                    names.add(station.name);
                }
                binding.baysStation.setSimpleItems(names.toArray(new String[0]));
                chooseLastUsed();
                if (offlineReason != null) {
                    Notices.problem(binding.baysNotice, offlineReason.message);
                }
            }

            /** The stations could not be loaded. */
            @Override
            public void onError(ApiError error) {
                if (binding == null) {
                    return;
                }
                setBusy(false);
                if (requireActivity() instanceof BaseActivity
                        && ((BaseActivity) requireActivity()).handledSessionEnd(error)) {
                    return;
                }
                Notices.problem(binding.baysNotice, error.message);
            }
        });
    }

    /** Picks the station chosen last time, or the first one. */
    private void chooseLastUsed() {
        if (stations.isEmpty()) {
            return;
        }
        String lastId = preferences().getString(LAST_STATION, null);
        StationDto pick = stations.get(0);
        for (StationDto station : stations) {
            if (station.id.equals(lastId)) {
                pick = station;
            }
        }
        binding.baysStation.setText(pick.name, false);
        choose(pick);
    }

    /** Shows the free bays of the chosen station. */
    private void choose(StationDto station) {
        chosen = station;
        freeBays = station.availableBatterySlots;
        preferences().edit().putString(LAST_STATION, station.id).apply();
        Notices.hide(binding.baysNotice);
        showCounter();
    }

    /** One bay more or less, kept between none and all of them. */
    private void change(int step) {
        if (chosen == null) {
            return;
        }
        freeBays = Math.max(0, Math.min(chosen.totalBatterySlots, freeBays + step));
        Notices.hide(binding.baysNotice);
        showCounter();
    }

    /** Writes the number and turns the buttons on or off. */
    private void showCounter() {
        boolean ready = chosen != null;
        binding.baysFree.setText(ready ? String.valueOf(freeBays) : "-");
        binding.baysTotal.setText(ready
                ? getString(R.string.bays_out_of, chosen.totalBatterySlots)
                : getString(R.string.bays_choose_station));
        binding.baysMinus.setEnabled(ready && freeBays > 0);
        binding.baysPlus.setEnabled(ready && freeBays < chosen.totalBatterySlots);
        binding.baysSave.setEnabled(ready && freeBays != chosen.availableBatterySlots);
    }

    /** Sends the new number to the API. */
    private void save() {
        if (chosen == null) {
            return;
        }
        setBusy(true);
        binding.baysSave.setEnabled(false);
        AppContainer.get().stations().updateBays(chosen.id, freeBays, new ApiCallback<StationDto>() {

            /** The API kept the number. */
            @Override
            public void onSuccess(StationDto station) {
                if (binding == null) {
                    return;
                }
                setBusy(false);
                if (station != null) {
                    replace(station);
                    chosen = station;
                    freeBays = station.availableBatterySlots;
                }
                showCounter();
                Notices.success(binding.baysNotice, getResources().getQuantityString(R.plurals.bays_saved,
                        chosen.totalBatterySlots, freeBays, chosen.totalBatterySlots, chosen.name));
            }

            /** The number was refused, or the server is not there. */
            @Override
            public void onError(ApiError error) {
                if (binding == null) {
                    return;
                }
                setBusy(false);
                showCounter();
                if (requireActivity() instanceof BaseActivity
                        && ((BaseActivity) requireActivity()).handledSessionEnd(error)) {
                    return;
                }
                Notices.problem(binding.baysNotice, error.message);
            }
        });
    }

    /** Puts the newer copy of a station into the list. */
    private void replace(StationDto station) {
        for (int i = 0; i < stations.size(); i++) {
            if (stations.get(i).id.equals(station.id)) {
                stations.set(i, station);
            }
        }
    }

    /** Where the chosen station is remembered on the phone. */
    private SharedPreferences preferences() {
        return requireContext().getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }

    /** Shows the progress bar while the API answers. */
    private void setBusy(boolean busy) {
        binding.baysProgress.setVisibility(busy ? View.VISIBLE : View.INVISIBLE);
    }

    /** Lets go of the views when the tab is closed. */
    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
