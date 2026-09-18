/*
 * File:    BookingsFragment.java
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: The Bookings tab. Current (approved and still to come), waiting
 *          (pending approval) and history (finished, cancelled, rejected or
 *          missed) each have a tab. A search box and three filters narrow the
 *          list; the API does the filtering and sends the list page by page.
 * Source:  AND-25 (RecyclerView lists), AND-26 (pull to refresh),
 *          AND-33 (Material tabs and date range picker).
 */
package lk.sliit.solargrid.ui.booking;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.util.Pair;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.datepicker.MaterialDatePicker;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;
import com.google.android.material.tabs.TabLayout;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

import lk.sliit.solargrid.AppContainer;
import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.model.BookingFilter;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.data.remote.dto.ReservationPageDto;
import lk.sliit.solargrid.data.remote.dto.StationDto;
import lk.sliit.solargrid.data.repo.CachedCallback;
import lk.sliit.solargrid.databinding.FragmentBookingsBinding;
import lk.sliit.solargrid.ui.common.BaseActivity;
import lk.sliit.solargrid.ui.common.Forms;
import lk.sliit.solargrid.util.Times;

public class BookingsFragment extends Fragment {

    /** The statuses a prosumer can filter by, in the order the dialog shows them. */
    private static final String[] STATUSES = {null, "Pending", "Approved", "Completed", "Cancelled", "Rejected"};

    /** The three lists, in the order of the tabs. */
    private static final String[] SCOPES = {BookingFilter.CURRENT, BookingFilter.PENDING, BookingFilter.HISTORY};

    private static final String ARG_SCOPE = "scope";

    private FragmentBookingsBinding binding;
    private final BookingFilter filter = new BookingFilter();
    private final ReservationAdapter adapter = new ReservationAdapter(
            booking -> startActivity(BookingDetailsActivity.intentFor(requireContext(), booking.id)), false);
    private int page = 1;
    private boolean loading;
    private boolean hasMore;

    /** Counts the reloads, so an answer for an older list is ignored. */
    private int generation;

    /** The Bookings tab, opened on one of its lists (current when none is given). */
    public static BookingsFragment showing(@Nullable String scope) {
        BookingsFragment fragment = new BookingsFragment();
        Bundle arguments = new Bundle();
        arguments.putString(ARG_SCOPE, scope);
        fragment.setArguments(arguments);
        return fragment;
    }

    /** Builds the tab: the three lists, search, filters and the new booking button. */
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        binding = FragmentBookingsBinding.inflate(inflater, container, false);

        // The list to start on is chosen before the tab listener is added, so it loads only once.
        String wanted = getArguments() == null ? null : getArguments().getString(ARG_SCOPE);
        if (savedInstanceState == null && wanted != null) {
            filter.scope = wanted;
        }
        TabLayout.Tab startTab = binding.bookingsTabs.getTabAt(indexOf(filter.scope));
        if (startTab != null) {
            startTab.select();
        }

        LinearLayoutManager layout = new LinearLayoutManager(requireContext());
        binding.bookingsList.setLayoutManager(layout);
        binding.bookingsList.setAdapter(adapter);
        binding.bookingsList.addOnScrollListener(new RecyclerView.OnScrollListener() {

            /** Loads the next page when the last cards come into view. */
            @Override
            public void onScrolled(@NonNull RecyclerView list, int dx, int dy) {
                if (dy > 0 && hasMore && !loading
                        && layout.findLastVisibleItemPosition() >= adapter.getItemCount() - 3) {
                    load(page + 1);
                }
            }
        });

        binding.bookingsTabs.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener() {

            /** Switches between current, waiting and history. */
            @Override
            public void onTabSelected(TabLayout.Tab tab) {
                filter.scope = SCOPES[Math.max(0, Math.min(SCOPES.length - 1, tab.getPosition()))];
                reload();
            }

            /** Nothing to do when a tab loses its place. */
            @Override
            public void onTabUnselected(TabLayout.Tab tab) {
            }

            /** Tapping the open tab again reloads it. */
            @Override
            public void onTabReselected(TabLayout.Tab tab) {
                reload();
            }
        });

        binding.bookingsSearch.setOnEditorActionListener((view, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_SEARCH) {
                filter.search = Forms.text(binding.bookingsSearch);
                reload();
                return true;
            }
            return false;
        });
        binding.bookingsSearchBox.setEndIconOnClickListener(view -> {
            binding.bookingsSearch.setText("");
            filter.search = null;
            reload();
        });
        binding.bookingsFilterStatus.setOnClickListener(view -> chooseStatus());
        binding.bookingsFilterStation.setOnClickListener(view -> chooseStation());
        binding.bookingsFilterDates.setOnClickListener(view -> chooseDates());
        binding.bookingsFilterClear.setOnClickListener(view -> {
            filter.clearExtraFilters();
            binding.bookingsSearch.setText("");
            reload();
        });
        binding.bookingsNew.setOnClickListener(view ->
                startActivity(BookingWizardActivity.forNewBooking(requireContext(), null)));
        binding.bookingsRefresh.setColorSchemeResources(R.color.accent);
        binding.bookingsRefresh.setOnRefreshListener(this::reload);
        return binding.getRoot();
    }

    /** Reloads when the tab comes back, for example after a booking was changed. */
    @Override
    public void onResume() {
        super.onResume();
        reload();
    }

    /** Moves to one of the three lists, for example "waiting" after a new booking. */
    public void showScope(String scope) {
        if (binding == null) {
            return;
        }
        TabLayout.Tab tab = binding.bookingsTabs.getTabAt(indexOf(scope));
        if (tab != null) {
            tab.select();
        }
    }

    /** The position of a list among the tabs; unknown words mean the first tab. */
    private static int indexOf(@Nullable String scope) {
        for (int i = 0; i < SCOPES.length; i++) {
            if (SCOPES[i].equals(scope)) {
                return i;
            }
        }
        return 0;
    }

    /** Starts the list again from the first page. */
    private void reload() {
        generation++;
        showFilterLabels();
        load(1);
    }

    /** Asks the API for one page of the list. */
    private void load(int wantedPage) {
        int asked = generation;
        loading = true;
        binding.bookingsRefresh.setRefreshing(true);
        AppContainer.get().reservations().list(filter, wantedPage, new CachedCallback<ReservationPageDto>() {

            /** Shows the page; a list from the phone is marked as possibly old. */
            @Override
            public void onResult(ReservationPageDto result, @Nullable ApiError offlineReason) {
                if (binding == null || asked != generation) {
                    return;
                }
                loading = false;
                binding.bookingsRefresh.setRefreshing(false);
                page = wantedPage;
                hasMore = offlineReason == null && result.hasMore();
                if (wantedPage == 1) {
                    adapter.show(result.items);
                } else {
                    adapter.append(result.items);
                }
                showEmpty(adapter.getItemCount() == 0);
                if (offlineReason != null) {
                    notice(getString(R.string.bookings_offline, offlineReason.message));
                } else {
                    binding.bookingsNotice.setVisibility(View.GONE);
                }
            }

            /** Nothing could be shown. */
            @Override
            public void onError(ApiError error) {
                if (binding == null || asked != generation) {
                    return;
                }
                loading = false;
                binding.bookingsRefresh.setRefreshing(false);
                if (requireActivity() instanceof BaseActivity
                        && ((BaseActivity) requireActivity()).handledSessionEnd(error)) {
                    return;
                }
                if (wantedPage == 1) {
                    adapter.show(new ArrayList<>());
                    showEmpty(false);
                }
                notice(error.message);
            }
        });
    }

    /** One status or any, from a short list. */
    private void chooseStatus() {
        String[] labels = {getString(R.string.filter_any_status), getString(R.string.status_pending),
                getString(R.string.status_approved), getString(R.string.status_completed),
                getString(R.string.status_cancelled), getString(R.string.status_rejected)};
        int chosen = 0;
        for (int i = 0; i < STATUSES.length; i++) {
            if (STATUSES[i] != null && STATUSES[i].equals(filter.status)) {
                chosen = i;
            }
        }
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle(R.string.filter_status_title)
                .setSingleChoiceItems(labels, chosen, (dialog, which) -> {
                    filter.status = STATUSES[which];
                    dialog.dismiss();
                    reload();
                })
                .show();
    }

    /** One station or any; the names come from the API. */
    private void chooseStation() {
        AppContainer.get().stations().search(null, new CachedCallback<List<StationDto>>() {

            /** Offers the stations in a short list. */
            @Override
            public void onResult(List<StationDto> stations, @Nullable ApiError offlineReason) {
                if (binding == null) {
                    return;
                }
                String[] names = new String[stations.size() + 1];
                names[0] = getString(R.string.filter_any_station);
                int chosen = 0;
                for (int i = 0; i < stations.size(); i++) {
                    names[i + 1] = stations.get(i).name;
                    if (stations.get(i).id.equals(filter.stationId)) {
                        chosen = i + 1;
                    }
                }
                new MaterialAlertDialogBuilder(requireContext())
                        .setTitle(R.string.filter_station_title)
                        .setSingleChoiceItems(names, chosen, (dialog, which) -> {
                            filter.stationId = which == 0 ? null : stations.get(which - 1).id;
                            filter.stationName = which == 0 ? null : stations.get(which - 1).name;
                            dialog.dismiss();
                            reload();
                        })
                        .show();
            }

            /** The stations could not be loaded. */
            @Override
            public void onError(ApiError error) {
                if (binding != null) {
                    notice(error.message);
                }
            }
        });
    }

    /** A range of days from the Material date range picker. */
    private void chooseDates() {
        MaterialDatePicker<Pair<Long, Long>> picker = MaterialDatePicker.Builder.dateRangePicker()
                .setTitleText(R.string.filter_dates_title)
                .build();
        picker.addOnPositiveButtonClickListener(range -> {
            // The picker answers with midnight UTC of each chosen day.
            filter.from = Instant.ofEpochMilli(range.first).atZone(ZoneOffset.UTC).toLocalDate();
            filter.to = Instant.ofEpochMilli(range.second).atZone(ZoneOffset.UTC).toLocalDate();
            reload();
        });
        picker.show(getChildFragmentManager(), "dates");
    }

    /** Writes the chosen filters on their chips and shows "Clear" when any is set. */
    private void showFilterLabels() {
        binding.bookingsFilterStatus.setText(filter.status == null
                ? getString(R.string.filter_status_any)
                : getString(R.string.filter_status_value, filter.status));
        binding.bookingsFilterStation.setText(filter.stationName == null
                ? getString(R.string.filter_station_any)
                : filter.stationName);
        binding.bookingsFilterDates.setText(filter.from == null
                ? getString(R.string.filter_dates_any)
                : getString(R.string.filter_dates_value, Times.dayChip(filter.from), Times.dayChip(filter.to)));
        binding.bookingsFilterClear.setVisibility(filter.hasExtraFilters() ? View.VISIBLE : View.GONE);
    }

    /** Shows the sentence for an empty tab. */
    private void showEmpty(boolean empty) {
        binding.bookingsEmpty.setVisibility(empty ? View.VISIBLE : View.GONE);
        if (empty) {
            binding.bookingsEmpty.setText(filter.hasExtraFilters() ? R.string.bookings_empty_filtered
                    : BookingFilter.CURRENT.equals(filter.scope) ? R.string.bookings_empty_current
                    : BookingFilter.PENDING.equals(filter.scope) ? R.string.bookings_empty_pending
                    : R.string.bookings_empty_history);
        }
    }

    /** Shows a short explanation above the list. */
    private void notice(String message) {
        binding.bookingsNotice.setText(message);
        binding.bookingsNotice.setVisibility(View.VISIBLE);
    }

    /** Lets go of the views when the tab is closed. */
    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
