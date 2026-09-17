/*
 * File:    CheckInResultActivity.java
 * Module:  Operator Check-in
 * Owner:   Ravindu
 * Purpose: Shows what the server said about a scanned code, the booking behind
 *          it, and lets the operator record the energy that was delivered. All
 *          the checking (signature, station, time window, status) happens in
 *          the API; this screen only shows the answer and sends the number.
 */
package lk.sliit.solargrid.ui.operator;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;

import androidx.annotation.Nullable;
import androidx.annotation.StringRes;

import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.remote.ApiCallback;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.data.remote.dto.CheckInResponse;
import lk.sliit.solargrid.data.remote.dto.ReservationDto;
import lk.sliit.solargrid.databinding.ActivityCheckInResultBinding;
import lk.sliit.solargrid.databinding.ViewDetailRowBinding;
import lk.sliit.solargrid.ui.common.BaseActivity;
import lk.sliit.solargrid.ui.common.StatusChips;
import lk.sliit.solargrid.util.Texts;
import lk.sliit.solargrid.util.Times;

public class CheckInResultActivity extends BaseActivity {

    /** The text that was read from the QR code, or typed by the operator. */
    public static final String EXTRA_PAYLOAD = "payload";

    private ActivityCheckInResultBinding binding;
    private String payload;
    private CheckInResponse checkIn;

    /** Opens this screen for one scanned code. */
    public static Intent intentFor(Context context, String payload) {
        return new Intent(context, CheckInResultActivity.class).putExtra(EXTRA_PAYLOAD, payload);
    }

    /** Builds the screen and asks the API about the code straight away. */
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityCheckInResultBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        payload = getIntent().getStringExtra(EXTRA_PAYLOAD);
        if (Texts.isBlank(payload)) {
            showError(getString(R.string.operator_manual_missing));
            return;
        }

        binding.resultBack.setOnClickListener(view -> finish());
        binding.errorRetry.setOnClickListener(view -> verify());
        binding.completeAction.setOnClickListener(view -> askToComplete());
        binding.doneNext.setOnClickListener(view -> finish());
        binding.doneClose.setOnClickListener(view -> finish());

        verify();
    }

    /** Sends the code to the API and waits for its decision. */
    private void verify() {
        showLoading();
        app().checkIn().verify(payload, new ApiCallback<CheckInResponse>() {

            /** The API answered; the booking and its message are shown. */
            @Override
            public void onSuccess(CheckInResponse response) {
                if (response == null || response.reservation == null) {
                    showError(getString(R.string.error_generic));
                    return;
                }
                showResult(response);
            }

            /** A bad code, another station, or no answer from the server. */
            @Override
            public void onError(ApiError error) {
                if (handledSessionEnd(error)) {
                    return;
                }
                showError(error.message);
            }
        });
    }

    /** Fills the cards with the answer of the API. */
    private void showResult(CheckInResponse response) {
        checkIn = response;
        ReservationDto booking = response.reservation;

        binding.stateLoading.setVisibility(View.GONE);
        binding.stateError.setVisibility(View.GONE);
        binding.stateResult.setVisibility(View.VISIBLE);
        binding.doneActions.setVisibility(View.GONE);

        binding.resultOrb.setBackgroundResource(
                response.canComplete ? R.drawable.bg_orb_emerald : R.drawable.bg_orb_amber);
        binding.resultIcon.setImageResource(
                response.canComplete ? R.drawable.ic_circle_check : R.drawable.ic_circle_alert);
        binding.resultTitle.setText(response.canComplete
                ? R.string.checkin_ready_title
                : R.string.checkin_blocked_title);
        binding.resultMessage.setText(Texts.orDash(response.message));
        showWindow(response);

        binding.bookingReference.setText(Texts.orDash(booking.referenceNo));
        StatusChips.apply(binding.bookingStatus, booking.status, booking.isPast);

        row(binding.bookingProsumerRow, R.string.checkin_prosumer, booking.prosumerName);
        row(binding.bookingStationRow, R.string.checkin_station, booking.stationName);
        row(binding.bookingSlotRow, R.string.checkin_slot, Times.slot(booking.startTime, booking.endTime));
        row(binding.bookingEnergyRow, R.string.checkin_energy, Texts.kwh(booking.energyKwh));
        row(binding.bookingTradeRow, R.string.checkin_trade, tradeLabel(booking.tradeType));

        showPhoneButton(response.prosumerPhone);

        binding.completeCard.setVisibility(response.canComplete ? View.VISIBLE : View.GONE);
        if (response.canComplete) {
            // The booked amount is offered first; the operator changes it to
            // whatever the meter showed.
            binding.deliveredKwh.setText(Texts.number(booking.energyKwh));
        }
    }

    /** Writes the hours in which the transfer may be finished. */
    private void showWindow(CheckInResponse response) {
        String opens = Times.time(response.checkInOpensAt);
        String closes = Times.time(response.checkInClosesAt);
        if (opens.isEmpty() || closes.isEmpty()) {
            binding.resultWindow.setVisibility(View.GONE);
            return;
        }
        binding.resultWindow.setVisibility(View.VISIBLE);
        binding.resultWindow.setText(getString(R.string.operator_window, opens, closes));
    }

    /** Shows the call button only when the API gave a phone number. */
    private void showPhoneButton(@Nullable String phone) {
        if (Texts.isBlank(phone)) {
            binding.bookingCall.setVisibility(View.GONE);
            return;
        }
        binding.bookingCall.setVisibility(View.VISIBLE);
        binding.bookingCall.setOnClickListener(view -> dial(phone));
    }

    /** Opens the phone app with the number typed in, but does not call. */
    private void dial(String phone) {
        try {
            startActivity(new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + phone)));
        } catch (ActivityNotFoundException missing) {
            showMessage(getString(R.string.checkin_no_phone_app));
        }
    }

    /** Checks the kWh box, then asks the operator to confirm. */
    private void askToComplete() {
        Double delivered = deliveredKwh();
        if (delivered == null) {
            return;
        }
        new MaterialAlertDialogBuilder(this)
                .setTitle(R.string.operator_complete_question)
                .setMessage(Texts.kwh(delivered))
                .setNegativeButton(R.string.action_cancel, null)
                .setPositiveButton(R.string.operator_complete_action, (dialog, which) -> complete(delivered))
                .show();
    }

    /** Reads the number the operator typed, or marks the box. */
    @Nullable
    private Double deliveredKwh() {
        CharSequence typed = binding.deliveredKwh.getText();
        String text = typed == null ? "" : typed.toString().trim().replace(',', '.');
        if (text.isEmpty()) {
            binding.deliveredBox.setError(getString(R.string.checkin_delivered_missing));
            return null;
        }
        try {
            double value = Double.parseDouble(text);
            if (value <= 0) {
                binding.deliveredBox.setError(getString(R.string.checkin_delivered_invalid));
                return null;
            }
            binding.deliveredBox.setError(null);
            return value;
        } catch (NumberFormatException notANumber) {
            binding.deliveredBox.setError(getString(R.string.checkin_delivered_invalid));
            return null;
        }
    }

    /** Sends the delivered energy and closes the booking. */
    private void complete(double delivered) {
        setCompleting(true);
        app().checkIn().complete(checkIn.reservation.id, payload, delivered, new ApiCallback<ReservationDto>() {

            /** The booking is finished; the screen shows the summary. */
            @Override
            public void onSuccess(ReservationDto booking) {
                setCompleting(false);
                if (booking == null) {
                    showMessage(getString(R.string.error_generic));
                    return;
                }
                showCompleted(booking);
            }

            /** The window closed, somebody else finished it, or no network. */
            @Override
            public void onError(ApiError error) {
                setCompleting(false);
                if (handledSessionEnd(error)) {
                    return;
                }
                showMessage(error.message);
            }
        });
    }

    /** The summary after the transfer was recorded. */
    private void showCompleted(ReservationDto booking) {
        binding.resultOrb.setBackgroundResource(R.drawable.bg_orb_emerald);
        binding.resultIcon.setImageResource(R.drawable.ic_circle_check);
        binding.resultTitle.setText(R.string.operator_completed_title);
        binding.resultMessage.setText(getString(R.string.operator_completed_message,
                Texts.orDash(booking.referenceNo),
                Texts.kwh(booking.deliveredKwh),
                Texts.orDash(booking.prosumerName)));
        binding.resultWindow.setVisibility(View.GONE);

        StatusChips.apply(binding.bookingStatus, booking.status, booking.isPast);
        row(binding.bookingEnergyRow, R.string.checkin_energy, Texts.kwh(booking.energyKwh));

        binding.completeCard.setVisibility(View.GONE);
        binding.doneActions.setVisibility(View.VISIBLE);
    }

    /** Turns the button off while the API is finishing the transfer. */
    private void setCompleting(boolean busy) {
        binding.completeAction.setEnabled(!busy);
        binding.completeProgress.setVisibility(busy ? View.VISIBLE : View.INVISIBLE);
    }

    /** Shows the spinner while the code is being checked. */
    private void showLoading() {
        binding.stateLoading.setVisibility(View.VISIBLE);
        binding.stateError.setVisibility(View.GONE);
        binding.stateResult.setVisibility(View.GONE);
    }

    /** Shows why the code could not be checked, with a way to try again. */
    private void showError(String message) {
        binding.stateLoading.setVisibility(View.GONE);
        binding.stateResult.setVisibility(View.GONE);
        binding.stateError.setVisibility(View.VISIBLE);
        binding.errorMessage.setText(message);
    }

    /** Writes one label and value line of the booking card. */
    private void row(ViewDetailRowBinding row, @StringRes int labelRes, @Nullable String value) {
        row.rowLabel.setText(labelRes);
        row.rowValue.setText(Texts.orDash(value));
    }

    /** "Export" or "Import" as the app writes it. */
    private String tradeLabel(@Nullable String tradeType) {
        if ("Export".equals(tradeType)) {
            return getString(R.string.trade_export);
        }
        if ("Import".equals(tradeType)) {
            return getString(R.string.trade_import);
        }
        return Texts.orDash(tradeType);
    }
}
