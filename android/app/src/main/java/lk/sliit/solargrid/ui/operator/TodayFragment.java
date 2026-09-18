/*
 * File:    TodayFragment.java
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: The operator's "Today" tab. It lists the bookings at every station
 *          on the chosen day (today and the six days after it), earliest
 *          first, with the prosumer's name, and shows three numbers from the
 *          staff dashboard. Tapping a booking opens its page, where the
 *          operator can cancel it for a prosumer who calls the station; the
 *          API applies the same 12-hour rule as for the prosumer.
 * Source:  AND-25 (RecyclerView lists), AND-26 (pull to refresh), AND-30 (chips).
 */
package lk.sliit.solargrid.ui.operator;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.google.android.material.chip.Chip;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import lk.sliit.solargrid.AppContainer;
import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.remote.ApiCallback;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.data.remote.dto.ReservationDto;
import lk.sliit.solargrid.data.remote.dto.ReservationPageDto;
import lk.sliit.solargrid.data.remote.dto.StaffDashboardDto;
import lk.sliit.solargrid.databinding.FragmentTodayBinding;
import lk.sliit.solargrid.ui.booking.BookingDetailsActivity;
import lk.sliit.solargrid.ui.booking.BookingTexts;
import lk.sliit.solargrid.ui.booking.ReservationAdapter;
import lk.sliit.solargrid.ui.common.BaseActivity;
import lk.sliit.solargrid.ui.common.Forms;
import lk.sliit.solargrid.ui.map.StationDetailsActivity;
import lk.sliit.solargrid.util.Times;

public class TodayFragment extends Fragment {

    private FragmentTodayBinding binding;
    private final ReservationAdapter adapter = new ReservationAdapter(
            booking -> startActivity(BookingDetailsActivity.intentFor(requireContext(), booking.id)), true);
    private LocalDate day = Times.today();
    private boolean resumedOnce;

    /** Counts the day loads, so an answer for an older day or search is ignored. */
    private int generation;

    /** Builds the tab: the numbers, the day buttons, the search box and the list. */
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        binding = FragmentTodayBinding.inflate(inflater, container, false);

        binding.todayList.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.todayList.setAdapter(adapter);
        binding.todayRefresh.setColorSchemeResources(R.color.accent);
        binding.todayRefresh.setOnRefreshListener(this::reload);
        binding.todaySearch.setOnEditorActionListener((view, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_SEARCH) {
                loadDay();
                return true;
            }
            return false;
        });
        binding.todaySearchBox.setEndIconOnClickListener(view -> {
            binding.todaySearch.setText("");
            loadDay();
        });
        addDayButtons();
        return binding.getRoot();
    }

    /** Reloads when the tab comes back, for example after a booking was cancelled. */
    @Override
    public void onResume() {
        super.onResume();
        if (resumedOnce) {
            reload();
        }
        resumedOnce = true;
    }

    /**
     * Today and the six days after it. Choosing the first button loads the
     * list and the numbers for the first time.
     */
    private void addDayButtons() {
        LocalDate today = Times.today();
        if (day.isBefore(today)) {
            day = today;
        }
        Chip chosen = null;
        for (int offset = 0; offset < StationDetailsActivity.DAYS_SHOWN; offset++) {
            LocalDate each = today.plusDays(offset);
            Chip chip = new Chip(requireContext());
            chip.setId(View.generateViewId());
            chip.setSaveEnabled(false);
            chip.setCheckable(true);
            chip.setText(BookingTexts.dayLabel(requireContext(), each, today));
            chip.setOnCheckedChangeListener((button, checked) -> {
                if (checked) {
                    day = each;
                    reload();
                }
            });
            binding.todayDays.addView(chip);
            if (each.equals(day)) {
                chosen = chip;
            }
        }
        if (chosen != null) {
            chosen.setChecked(true);
        }
    }

    /** Loads the list of the chosen day and the numbers. */
    private void reload() {
        loadDay();
        loadNumbers();
    }

    /** Asks the API for every booking of the chosen day. */
    private void loadDay() {
        int asked = ++generation;
        LocalDate forDay = day;
        binding.todayRefresh.setRefreshing(true);
        binding.todayCountDayLabel.setText(getString(R.string.today_count_day_on,
                BookingTexts.dayLabel(requireContext(), forDay, Times.today())));
        AppContainer.get().reservations().forDay(forDay, Forms.text(binding.todaySearch),
                new ApiCallback<ReservationPageDto>() {

                    /** Shows the bookings, earliest first. */
                    @Override
                    public void onSuccess(ReservationPageDto page) {
                        if (binding == null || asked != generation) {
                            return;
                        }
                        binding.todayRefresh.setRefreshing(false);
                        binding.todayNotice.setVisibility(View.GONE);
                        List<ReservationDto> bookings = page == null ? new ArrayList<>() : earliestFirst(page.items);
                        adapter.show(bookings);
                        binding.todayEmpty.setVisibility(bookings.isEmpty() ? View.VISIBLE : View.GONE);
                        binding.todayCountDay.setText(String.valueOf(page == null ? 0 : page.total));
                    }

                    /** Keeps the old list and says why it could not be loaded. */
                    @Override
                    public void onError(ApiError error) {
                        if (binding == null || asked != generation) {
                            return;
                        }
                        binding.todayRefresh.setRefreshing(false);
                        if (endedSession(error)) {
                            return;
                        }
                        binding.todayNotice.setText(error.message);
                        binding.todayNotice.setVisibility(View.VISIBLE);
                    }
                });
    }

    /** The staff numbers: waiting for approval and approved bookings still to come. */
    private void loadNumbers() {
        AppContainer.get().dashboard().staffSummary(new ApiCallback<StaffDashboardDto>() {

            /** Writes the two numbers. */
            @Override
            public void onSuccess(StaffDashboardDto numbers) {
                if (binding == null || numbers == null) {
                    return;
                }
                binding.todayCountPending.setText(String.valueOf(numbers.pendingReservations));
                binding.todayCountApproved.setText(String.valueOf(numbers.approvedFutureReservations));
            }

            /** The list shows the same problem, so nothing more is said here. */
            @Override
            public void onError(ApiError error) {
                if (binding != null) {
                    endedSession(error);
                }
            }
        });
    }

    /** Sends the operator to the login screen when the API ended the session. */
    private boolean endedSession(ApiError error) {
        return requireActivity() instanceof BaseActivity
                && ((BaseActivity) requireActivity()).handledSessionEnd(error);
    }

    /** The API lists the newest slot first; a day plan reads better from the morning on. */
    private static List<ReservationDto> earliestFirst(@Nullable List<ReservationDto> bookings) {
        List<ReservationDto> sorted = bookings == null ? new ArrayList<>() : new ArrayList<>(bookings);
        sorted.sort(Comparator.comparing(booking -> {
            Instant start = Times.toInstant(booking.startTime);
            return start == null ? Instant.MAX : start;
        }));
        return sorted;
    }

    /** Lets go of the views when the tab is closed. */
    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
