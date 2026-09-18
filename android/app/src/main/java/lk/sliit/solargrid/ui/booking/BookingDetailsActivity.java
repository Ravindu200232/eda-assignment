/*
 * File:    BookingDetailsActivity.java
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: The page of one booking. It says what happens next, shows the QR
 *          code once the booking is approved (with the screen at full
 *          brightness, so the operator's camera reads it easily), lists the
 *          details and the history, and offers Change and Cancel while the API
 *          says the booking can still be changed. Grid Operators open the same
 *          page from their "Today" list and can cancel for the prosumer.
 * Source:  AND-32 (ZXing QR code encoder), AND-34 (screen brightness),
 *          AND-35 (returning to an open screen).
 */
package lk.sliit.solargrid.ui.booking;

import android.content.Context;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.StringRes;
import androidx.core.content.ContextCompat;

import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import java.time.Instant;

import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.model.Roles;
import lk.sliit.solargrid.data.remote.ApiCallback;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.data.remote.dto.QrCodeDto;
import lk.sliit.solargrid.data.remote.dto.ReservationDto;
import lk.sliit.solargrid.data.remote.dto.UserDto;
import lk.sliit.solargrid.data.repo.CachedCallback;
import lk.sliit.solargrid.databinding.ActivityBookingDetailsBinding;
import lk.sliit.solargrid.databinding.DialogReasonBinding;
import lk.sliit.solargrid.databinding.ViewDetailRowBinding;
import lk.sliit.solargrid.databinding.ViewTimelineStepBinding;
import lk.sliit.solargrid.ui.common.BaseActivity;
import lk.sliit.solargrid.ui.common.Forms;
import lk.sliit.solargrid.ui.common.StatusChips;
import lk.sliit.solargrid.util.Texts;
import lk.sliit.solargrid.util.Times;

public class BookingDetailsActivity extends BaseActivity {

    private static final String EXTRA_BOOKING_ID = "bookingId";

    private ActivityBookingDetailsBinding binding;
    private String bookingId;
    @Nullable
    private ReservationDto booking;
    private boolean operatorView;
    private boolean startedLoading;
    private int requestsRunning;

    /** Opens the page of one booking. */
    public static Intent intentFor(Context context, String bookingId) {
        return new Intent(context, BookingDetailsActivity.class).putExtra(EXTRA_BOOKING_ID, bookingId);
    }

    /** Builds the page and loads the booking. */
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityBookingDetailsBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        leaveRoomForSystemBars(binding.getRoot());

        bookingId = getIntent().getStringExtra(EXTRA_BOOKING_ID);
        operatorView = Roles.isOperator(sessions().role());

        binding.detailsBack.setOnClickListener(view -> finish());
        binding.detailsChange.setOnClickListener(view ->
                startActivity(BookingWizardActivity.forChange(this, bookingId)));
        binding.detailsCancel.setOnClickListener(view -> askToCancel());
        if (operatorView) {
            binding.detailsCancel.setText(R.string.booking_cancel_for_prosumer);
        }

        withLocalNetwork(this::load, () -> notice(getString(R.string.local_network_refused)));
    }

    /** A summary screen opened this page again, maybe for another booking. */
    @Override
    protected void onNewIntent(@NonNull Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        String id = intent.getStringExtra(EXTRA_BOOKING_ID);
        if (id != null) {
            bookingId = id;
        }
    }

    /** Loads the booking again when the page comes back, for example after a change. */
    @Override
    protected void onResume() {
        super.onResume();
        if (startedLoading && requestsRunning == 0) {
            load();
        }
    }

    /** Asks the API for the booking; offline, the copy saved on the phone is shown. */
    private void load() {
        startedLoading = true;
        setBusy(true);
        app().reservations().get(bookingId, new CachedCallback<ReservationDto>() {

            /** Fills the page; a copy from the phone cannot be changed. */
            @Override
            public void onResult(ReservationDto result, @Nullable ApiError offlineReason) {
                setBusy(false);
                if (result == null) {
                    notice(getString(R.string.error_generic));
                    return;
                }
                if (offlineReason == null) {
                    binding.detailsNotice.setVisibility(View.GONE);
                } else {
                    notice(getString(R.string.booking_offline, offlineReason.message));
                }
                show(result, offlineReason == null);
            }

            /** Nothing could be loaded, not even a saved copy. */
            @Override
            public void onError(ApiError error) {
                setBusy(false);
                if (!handledSessionEnd(error)) {
                    notice(error.message);
                }
            }
        });
    }

    /** Writes the booking on the page. */
    private void show(ReservationDto shown, boolean online) {
        booking = shown;
        binding.detailsReference.setText(Texts.orDash(shown.referenceNo));
        StatusChips.apply(binding.detailsStatus, shown.status, shown.isPast);
        binding.detailsNext.setText(BookingTexts.nextStep(this, shown, operatorView));

        row(binding.detailsStationRow, R.string.booking_station, shown.stationName);
        row(binding.detailsSlotRow, R.string.booking_slot, Times.slot(shown.startTime, shown.endTime));
        row(binding.detailsEnergyRow, R.string.booking_energy, Texts.kwh(shown.energyKwh));
        row(binding.detailsTradeRow, R.string.booking_trade, BookingTexts.trade(this, shown.tradeType));
        row(binding.detailsDeliveredRow, R.string.booking_delivered, Texts.kwh(shown.deliveredKwh));
        binding.detailsDeliveredRow.getRoot().setVisibility(shown.deliveredKwh == null ? View.GONE : View.VISIBLE);
        row(binding.detailsProsumerRow, R.string.booking_prosumer,
                getString(R.string.booking_prosumer_value, Texts.orDash(shown.prosumerName), Texts.orDash(shown.prosumerNic)));
        binding.detailsProsumerRow.getRoot().setVisibility(operatorView ? View.VISIBLE : View.GONE);

        showChanges(shown, online);
        showTimeline(shown);

        // Operators check the prosumer's code with the scanner; they do not need to see it.
        // A missed booking's code can no longer be used, so it is not shown either.
        if (shown.hasQrCode && !shown.isPast && online && !operatorView) {
            loadQrCode();
        } else {
            hideQrCode();
        }
    }

    /**
     * Until when the booking can be changed, and the two buttons. The buttons
     * follow the API's canModify flag; a copy from the phone never allows a
     * change, because only the server knows whether it is still allowed.
     */
    private void showChanges(ReservationDto shown, boolean online) {
        String window = BookingTexts.changeWindow(this, shown);
        if (window == null) {
            binding.detailsChangesCard.setVisibility(View.GONE);
            return;
        }
        binding.detailsChangesCard.setVisibility(View.VISIBLE);
        binding.detailsChangeWindow.setText(online ? window : getString(R.string.booking_change_offline));
        boolean allowed = online && shown.canModify;
        binding.detailsChange.setVisibility(allowed && !operatorView ? View.VISIBLE : View.GONE);
        binding.detailsCancel.setVisibility(allowed ? View.VISIBLE : View.GONE);
    }

    /** One line for each step of the booking's history. */
    private void showTimeline(ReservationDto shown) {
        binding.detailsTimeline.removeAllViews();
        UserDto viewer = sessions().user();
        String viewerNic = viewer == null ? null : viewer.nic;
        for (BookingTimeline.Step step : BookingTimeline.of(this, shown, viewerNic, Instant.now())) {
            ViewTimelineStepBinding line = ViewTimelineStepBinding.inflate(getLayoutInflater(), binding.detailsTimeline, true);
            line.stepTitle.setText(step.title);
            line.stepWhen.setText(Times.dateTime(step.at));
            line.stepDetail.setText(step.detail);
            line.stepDot.setBackgroundTintList(ColorStateList.valueOf(
                    ContextCompat.getColor(this, step.done ? R.color.accent : R.color.accent_light)));
        }
    }

    /** Asks the API for the signed QR text and draws it. */
    private void loadQrCode() {
        setBusy(true);
        app().reservations().qrCode(bookingId, new ApiCallback<QrCodeDto>() {

            /** Draws the code at the size of the picture box. */
            @Override
            public void onSuccess(QrCodeDto qr) {
                setBusy(false);
                Bitmap picture = qr == null || Texts.isBlank(qr.payload)
                        ? null
                        : QrImages.draw(qr.payload, binding.detailsQr.getLayoutParams().width);
                if (picture == null) {
                    hideQrCode();
                    notice(getString(R.string.booking_qr_failed));
                    return;
                }
                binding.detailsQr.setImageBitmap(picture);
                binding.detailsQrText.setText(qr.payload);
                binding.detailsQrCard.setVisibility(View.VISIBLE);
                keepScreenBright(true);
            }

            /** The booking changed in the meantime, or the server could not be reached. */
            @Override
            public void onError(ApiError error) {
                setBusy(false);
                hideQrCode();
                if (!handledSessionEnd(error)) {
                    notice(error.message);
                }
            }
        });
    }

    /** Takes the QR code away and gives the screen its normal brightness back. */
    private void hideQrCode() {
        binding.detailsQrCard.setVisibility(View.GONE);
        binding.detailsQr.setImageDrawable(null);
        keepScreenBright(false);
    }

    /**
     * Turns the screen to full brightness and keeps it on while the QR code
     * is shown. It only affects this page; leaving it gives the phone's own
     * brightness back.
     */
    private void keepScreenBright(boolean bright) {
        WindowManager.LayoutParams attributes = getWindow().getAttributes();
        attributes.screenBrightness = bright
                ? WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_FULL
                : WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE;
        getWindow().setAttributes(attributes);
        if (bright) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        } else {
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
    }

    /** Asks for an optional reason before cancelling. */
    private void askToCancel() {
        if (booking == null) {
            return;
        }
        DialogReasonBinding form = DialogReasonBinding.inflate(getLayoutInflater());
        form.reasonMessage.setText(operatorView
                ? getString(R.string.booking_cancel_message_staff, Texts.orDash(booking.prosumerName))
                : getString(R.string.booking_cancel_message));
        new MaterialAlertDialogBuilder(this)
                .setTitle(getString(R.string.booking_cancel_title, Texts.orDash(booking.referenceNo)))
                .setView(form.getRoot())
                .setNegativeButton(R.string.booking_keep, null)
                .setPositiveButton(R.string.booking_cancel_confirm, (dialog, which) -> cancel(Forms.text(form.reason)))
                .show();
    }

    /** Sends the cancellation; the summary screen shows what the API answered. */
    private void cancel(String reason) {
        setBusy(true);
        setButtonsEnabled(false);
        app().reservations().cancel(bookingId, reason, new ApiCallback<ReservationDto>() {

            /** The booking is cancelled and its bay is free again. */
            @Override
            public void onSuccess(ReservationDto cancelled) {
                setBusy(false);
                setButtonsEnabled(true);
                if (cancelled == null) {
                    showMessage(getString(R.string.error_generic));
                    return;
                }
                startActivity(BookingResultActivity.intentFor(BookingDetailsActivity.this,
                        BookingResultActivity.CANCELLED, cancelled));
            }

            /** Too late (12-hour rule), changed by someone else, or no connection. */
            @Override
            public void onError(ApiError error) {
                setBusy(false);
                setButtonsEnabled(true);
                if (handledSessionEnd(error)) {
                    return;
                }
                showMessage(error.message);
                load();
            }
        });
    }

    /** Turns Change and Cancel off while a request is running. */
    private void setButtonsEnabled(boolean enabled) {
        binding.detailsChange.setEnabled(enabled);
        binding.detailsCancel.setEnabled(enabled);
    }

    /** Writes one label and value line. */
    private void row(ViewDetailRowBinding row, @StringRes int label, @Nullable String value) {
        row.rowLabel.setText(label);
        row.rowValue.setText(Texts.orDash(value));
    }

    /** Shows why the page may be old or empty. */
    private void notice(String message) {
        binding.detailsNotice.setText(message);
        binding.detailsNotice.setVisibility(View.VISIBLE);
    }

    /** Shows the progress bar while any request of this page is running. */
    private void setBusy(boolean busy) {
        requestsRunning = Math.max(0, requestsRunning + (busy ? 1 : -1));
        binding.detailsProgress.setVisibility(requestsRunning > 0 ? View.VISIBLE : View.INVISIBLE);
    }
}
