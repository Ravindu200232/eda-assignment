/*
 * File:    HomeFragment.java
 * Module:  Dashboards
 * Owner:   Malith
 * Purpose: The prosumer home screen. It shows how many bookings are waiting
 *          for approval and how many approved ones are still to come (the two
 *          numbers the brief asks for), the finished transfers, the next
 *          booking and the ones after it. The API does all the counting.
 * Source:  AND-25 (RecyclerView lists), AND-26 (pull to refresh).
 */
package lk.sliit.solargrid.ui.prosumer;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.DrawableRes;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.StringRes;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;

import java.time.Instant;
import java.util.List;

import lk.sliit.solargrid.AppContainer;
import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.remote.ApiCallback;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.data.remote.dto.BookingSummaryDto;
import lk.sliit.solargrid.data.remote.dto.ProsumerDashboardDto;
import lk.sliit.solargrid.data.remote.dto.UserDto;
import lk.sliit.solargrid.databinding.FragmentHomeBinding;
import lk.sliit.solargrid.databinding.ViewStatTileBinding;
import lk.sliit.solargrid.ui.common.BaseActivity;
import lk.sliit.solargrid.util.Texts;
import lk.sliit.solargrid.util.Times;

public class HomeFragment extends Fragment {

    private FragmentHomeBinding binding;
    private final BookingSummaryAdapter upcoming = new BookingSummaryAdapter();

    /** Builds the screen, labels the four tiles and starts loading. */
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        binding = FragmentHomeBinding.inflate(inflater, container, false);

        tile(binding.homePending, R.drawable.bg_orb_amber, R.drawable.ic_clock, R.string.home_pending_label);
        tile(binding.homeApproved, R.drawable.bg_orb_emerald, R.drawable.ic_circle_check, R.string.home_approved_label);
        tile(binding.homeCompleted, R.drawable.bg_orb_violet, R.drawable.ic_list_checks, R.string.home_completed_label);
        tile(binding.homeDelivered, R.drawable.bg_orb_sky, R.drawable.ic_zap, R.string.home_delivered_label);

        binding.homeUpcoming.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.homeUpcoming.setAdapter(upcoming);
        binding.homeRefresh.setColorSchemeResources(R.color.accent);
        binding.homeRefresh.setOnRefreshListener(this::load);
        binding.homeBook.setOnClickListener(view -> openBookings());

        showGreeting(AppContainer.get().session().user());
        load();
        return binding.getRoot();
    }

    /** "Hello, Kasun" - the first name of the signed-in prosumer. */
    private void showGreeting(@Nullable UserDto user) {
        String name = user == null ? "" : user.firstName();
        binding.homeGreeting.setText(name.isEmpty()
                ? getString(R.string.home_greeting_plain)
                : getString(R.string.home_greeting, name));
    }

    /** Asks the API for the newest numbers. */
    private void load() {
        binding.homeRefresh.setRefreshing(true);
        AppContainer.get().dashboard().load(new ApiCallback<ProsumerDashboardDto>() {

            /** Fills the tiles and the lists. */
            @Override
            public void onSuccess(ProsumerDashboardDto dashboard) {
                if (binding == null) {
                    return;
                }
                binding.homeRefresh.setRefreshing(false);
                binding.homeNotice.setVisibility(View.GONE);
                if (dashboard != null) {
                    show(dashboard);
                }
            }

            /** Keeps what is on screen and says why it could not be refreshed. */
            @Override
            public void onError(ApiError error) {
                if (binding == null) {
                    return;
                }
                binding.homeRefresh.setRefreshing(false);
                if (requireActivity() instanceof BaseActivity
                        && ((BaseActivity) requireActivity()).handledSessionEnd(error)) {
                    return;
                }
                binding.homeNotice.setText(error.message);
                binding.homeNotice.setVisibility(View.VISIBLE);
            }
        });
    }

    /** Writes the numbers and the bookings on the screen. */
    private void show(ProsumerDashboardDto dashboard) {
        binding.homePending.statValue.setText(String.valueOf(dashboard.pendingCount));
        binding.homeApproved.statValue.setText(String.valueOf(dashboard.approvedFutureCount));
        binding.homeCompleted.statValue.setText(String.valueOf(dashboard.completedCount));
        binding.homeDelivered.statValue.setText(Texts.number(dashboard.totalDeliveredKwh));

        BookingSummaryDto next = dashboard.nextReservation;
        binding.homeNextSection.setVisibility(next == null ? View.GONE : View.VISIBLE);
        binding.homeEmpty.setVisibility(next == null ? View.VISIBLE : View.GONE);
        if (next != null) {
            BookingSummaryAdapter.bind(binding.homeNext, next);
            binding.homeNextGap.setText(Times.humanGap(next.startTime, Instant.now()));
        }

        // The first coming booking is already shown above as the next one.
        List<BookingSummaryDto> later = dashboard.upcomingReservations == null || dashboard.upcomingReservations.size() <= 1
                ? List.of()
                : dashboard.upcomingReservations.subList(1, dashboard.upcomingReservations.size());
        upcoming.show(later);
        binding.homeUpcomingTitle.setVisibility(later.isEmpty() ? View.GONE : View.VISIBLE);
    }

    /** Sets the colour, icon and words of one tile. */
    private void tile(ViewStatTileBinding tile, @DrawableRes int orb, @DrawableRes int icon, @StringRes int label) {
        tile.statOrb.setBackgroundResource(orb);
        tile.statIcon.setImageResource(icon);
        tile.statLabel.setText(label);
        tile.statValue.setText("-");
    }

    /** Moves to the Bookings tab, where a new booking is made. */
    private void openBookings() {
        if (requireActivity() instanceof MainActivity) {
            ((MainActivity) requireActivity()).openTab(R.id.tab_bookings);
        }
    }

    /** Lets go of the views when the tab is closed. */
    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
