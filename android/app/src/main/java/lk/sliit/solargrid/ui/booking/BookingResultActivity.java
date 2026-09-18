/*
 * File:    BookingResultActivity.java
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: The summary page the brief asks for after every booking action.
 *          It shows the booking exactly as the API saved it - made, changed
 *          or cancelled - with its reference, slot and status, and says what
 *          happens next. From here the prosumer opens the booking or goes
 *          back to the list.
 * Source:  AND-35 (returning to an open screen).
 */
package lk.sliit.solargrid.ui.booking;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;

import androidx.annotation.DrawableRes;
import androidx.annotation.Nullable;
import androidx.annotation.StringRes;

import com.google.gson.Gson;
import com.google.gson.JsonParseException;

import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.model.BookingFilter;
import lk.sliit.solargrid.data.model.Roles;
import lk.sliit.solargrid.data.remote.dto.ReservationDto;
import lk.sliit.solargrid.databinding.ActivityBookingResultBinding;
import lk.sliit.solargrid.databinding.ViewDetailRowBinding;
import lk.sliit.solargrid.ui.common.BaseActivity;
import lk.sliit.solargrid.ui.common.StatusChips;
import lk.sliit.solargrid.ui.operator.OperatorActivity;
import lk.sliit.solargrid.ui.prosumer.MainActivity;
import lk.sliit.solargrid.util.Texts;
import lk.sliit.solargrid.util.Times;

public class BookingResultActivity extends BaseActivity {

    /** A new booking was made. */
    public static final String CREATED = "created";
    /** A booking was changed. */
    public static final String CHANGED = "changed";
    /** A booking was cancelled. */
    public static final String CANCELLED = "cancelled";

    private static final String EXTRA_WHAT = "what";
    private static final String EXTRA_BOOKING = "booking";
    private static final Gson GSON = new Gson();

    private ActivityBookingResultBinding binding;

    /** Opens the summary for a booking the API has just saved. */
    public static Intent intentFor(Context context, String what, ReservationDto booking) {
        return new Intent(context, BookingResultActivity.class)
                .putExtra(EXTRA_WHAT, what)
                .putExtra(EXTRA_BOOKING, GSON.toJson(booking));
    }

    /** Builds the summary from the booking that came with the screen. */
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityBookingResultBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        leaveRoomForSystemBars(binding.getRoot());

        String what = getIntent().getStringExtra(EXTRA_WHAT);
        ReservationDto booking = readBooking(getIntent().getStringExtra(EXTRA_BOOKING));
        if (booking == null) {
            finish();
            return;
        }
        boolean operatorView = Roles.isOperator(sessions().role());

        show(what == null ? CREATED : what, booking, operatorView);
        binding.resultOpen.setOnClickListener(view -> openBooking(booking.id));
        binding.resultList.setText(operatorView ? R.string.result_back_to_today : R.string.result_back_to_bookings);
        binding.resultList.setOnClickListener(view -> backToList(what, operatorView));
    }

    /** The booking sent by the screen before, or null when it cannot be read. */
    @Nullable
    private static ReservationDto readBooking(@Nullable String json) {
        if (json == null) {
            return null;
        }
        try {
            return GSON.fromJson(json, ReservationDto.class);
        } catch (JsonParseException broken) {
            return null;
        }
    }

    /** Writes what happened and the booking as it is now. */
    private void show(String what, ReservationDto booking, boolean operatorView) {
        String reference = Texts.orDash(booking.referenceNo);
        if (CANCELLED.equals(what)) {
            header(R.drawable.bg_orb_pink, R.drawable.ic_ban, R.string.result_cancelled_title);
            binding.resultMessage.setText(operatorView
                    ? getString(R.string.result_cancelled_message_staff, reference, Texts.orDash(booking.prosumerName))
                    : getString(R.string.result_cancelled_message, reference));
        } else if (CHANGED.equals(what)) {
            header(R.drawable.bg_orb_violet, R.drawable.ic_pencil, R.string.result_changed_title);
            binding.resultMessage.setText(getString(R.string.result_changed_message, reference));
        } else {
            header(R.drawable.bg_orb_emerald, R.drawable.ic_circle_check, R.string.result_created_title);
            binding.resultMessage.setText(getString(R.string.result_created_message, reference));
        }

        binding.resultReference.setText(reference);
        StatusChips.apply(binding.resultStatus, booking.status, booking.isPast);
        row(binding.resultStationRow, R.string.booking_station, booking.stationName);
        row(binding.resultSlotRow, R.string.booking_slot, Times.slot(booking.startTime, booking.endTime));
        row(binding.resultEnergyRow, R.string.booking_energy, Texts.kwh(booking.energyKwh));
        row(binding.resultTradeRow, R.string.booking_trade, BookingTexts.trade(this, booking.tradeType));
        row(binding.resultProsumerRow, R.string.booking_prosumer,
                getString(R.string.booking_prosumer_value, Texts.orDash(booking.prosumerName), Texts.orDash(booking.prosumerNic)));
        binding.resultProsumerRow.getRoot().setVisibility(operatorView ? View.VISIBLE : View.GONE);
        binding.resultNext.setText(BookingTexts.nextStep(this, booking, operatorView));
    }

    /** The coloured circle, its icon and the title. */
    private void header(@DrawableRes int orb, @DrawableRes int icon, @StringRes int title) {
        binding.resultOrb.setBackgroundResource(orb);
        binding.resultIcon.setImageResource(icon);
        binding.resultTitle.setText(title);
    }

    /**
     * Opens the booking page. When that page is already open underneath (after
     * a change or a cancel), it comes back to the front and reloads, instead
     * of a second copy being opened.
     */
    private void openBooking(String bookingId) {
        startActivity(BookingDetailsActivity.intentFor(this, bookingId)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP));
        finish();
    }

    /**
     * Goes back to the booking list, on the tab where the booking now is: a
     * new or changed booking waits for approval, a cancelled one is history.
     * Operators go back to their "Today" list.
     */
    private void backToList(@Nullable String what, boolean operatorView) {
        Intent intent;
        if (operatorView) {
            intent = OperatorActivity.openTab(this, R.id.tab_today);
        } else {
            intent = MainActivity.openBookings(this,
                    CANCELLED.equals(what) ? BookingFilter.HISTORY : BookingFilter.PENDING);
        }
        startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP));
        finish();
    }

    /** Writes one label and value line. */
    private void row(ViewDetailRowBinding row, @StringRes int label, @Nullable String value) {
        row.rowLabel.setText(label);
        row.rowValue.setText(Texts.orDash(value));
    }
}
