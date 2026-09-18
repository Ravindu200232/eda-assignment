/*
 * File:    StationDetailsActivity.java
 * Module:  Stations
 * Owner:   Nimthara
 * Purpose: The page of one station: free bays, energy per booking and panel
 *          sizes, the weekly opening hours, and the slots of each of the next
 *          seven days with how many bays each still has. Slots always come
 *          from the API, because a booking needs the free bays of right now.
 */
package lk.sliit.solargrid.ui.map;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;

import androidx.annotation.Nullable;
import androidx.annotation.StringRes;
import androidx.core.content.ContextCompat;

import com.google.android.material.chip.Chip;

import java.time.LocalDate;
import java.util.List;

import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.remote.ApiCallback;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.data.remote.dto.SlotDto;
import lk.sliit.solargrid.data.remote.dto.StationDto;
import lk.sliit.solargrid.data.repo.CachedCallback;
import lk.sliit.solargrid.databinding.ActivityStationDetailsBinding;
import lk.sliit.solargrid.databinding.ViewDetailRowBinding;
import lk.sliit.solargrid.ui.common.BaseActivity;
import lk.sliit.solargrid.util.OpeningHours;
import lk.sliit.solargrid.util.Texts;
import lk.sliit.solargrid.util.Times;

public class StationDetailsActivity extends BaseActivity {

    /** Bookings are only allowed within seven days, so seven day buttons are shown. */
    public static final int DAYS_SHOWN = 7;

    private static final String EXTRA_STATION_ID = "stationId";

    private ActivityStationDetailsBinding binding;
    private String stationId;
    private Chip todayChip;
    private int requestsRunning;

    /** Opens the page of one station. */
    public static Intent intentFor(Context context, String stationId) {
        return new Intent(context, StationDetailsActivity.class).putExtra(EXTRA_STATION_ID, stationId);
    }

    /** Builds the page, the day buttons and starts loading. */
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityStationDetailsBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        leaveRoomForSystemBars(binding.getRoot());

        stationId = getIntent().getStringExtra(EXTRA_STATION_ID);
        binding.stationBack.setOnClickListener(view -> finish());
        addDayButtons();
        withLocalNetwork(() -> {
            loadStation();
            todayChip.setChecked(true);
        }, () -> showNotice(getString(R.string.local_network_refused)));
    }

    /** Today, tomorrow and the five days after, as single-choice chips. */
    private void addDayButtons() {
        LocalDate today = Times.today();
        for (int offset = 0; offset < DAYS_SHOWN; offset++) {
            LocalDate day = today.plusDays(offset);
            Chip chip = new Chip(this);
            chip.setId(View.generateViewId());
            chip.setCheckable(true);
            chip.setText(offset == 0 ? getString(R.string.day_today)
                    : offset == 1 ? getString(R.string.day_tomorrow)
                    : Times.dayChip(day));
            chip.setOnCheckedChangeListener((button, checked) -> {
                if (checked) {
                    loadSlots(day);
                }
            });
            binding.stationDays.addView(chip);
            if (offset == 0) {
                todayChip = chip;
            }
        }
    }

    /** Loads the station, from the API or, offline, from the phone. */
    private void loadStation() {
        setBusy(true);
        app().stations().station(stationId, new CachedCallback<StationDto>() {

            /** Fills the page; a copy from the phone is marked as possibly old. */
            @Override
            public void onResult(StationDto station, @Nullable ApiError offlineReason) {
                setBusy(false);
                show(station);
                if (offlineReason != null) {
                    showNotice(getString(R.string.station_offline, offlineReason.message));
                }
            }

            /** Nothing could be loaded. */
            @Override
            public void onError(ApiError error) {
                setBusy(false);
                if (!handledSessionEnd(error)) {
                    showNotice(error.message);
                }
            }
        });
    }

    /** Writes the station and its week on the page. */
    private void show(StationDto station) {
        binding.stationName.setText(station.name);
        binding.stationAddress.setText(StationTexts.where(this, station));
        StationTexts.paintBays(binding.stationBays, station);
        row(binding.stationEnergyRow, R.string.station_energy_label, Texts.kwh(station.bayCapacityKwh));
        row(binding.stationSolarRow, R.string.station_solar_label,
                getString(R.string.kw_value, Texts.number(station.solarCapacityKw)));
        row(binding.stationStorageRow, R.string.station_storage_label, Texts.kwh(station.storageCapacityKwh));
        row(binding.stationCodeRow, R.string.station_code_label, station.code);

        binding.stationHours.removeAllViews();
        int today = Times.today().getDayOfWeek().getValue();
        for (OpeningHours.Line line : OpeningHours.week(station.schedule)) {
            ViewDetailRowBinding row = ViewDetailRowBinding.inflate(getLayoutInflater(), binding.stationHours, true);
            row.rowLabel.setText(line.dayName);
            row.rowValue.setText(line.hours == null ? getString(R.string.station_closed) : line.hours);
            if (line.day.getValue() == today) {
                row.rowLabel.setTextColor(ContextCompat.getColor(this, R.color.accent));
                row.rowValue.setTextColor(ContextCompat.getColor(this, R.color.accent));
            }
        }
    }

    /** Asks the API for the slots of one day. */
    private void loadSlots(LocalDate day) {
        binding.stationSlots.removeAllViews();
        binding.stationSlotsEmpty.setVisibility(View.GONE);
        setBusy(true);
        app().stations().slots(stationId, day, new ApiCallback<List<SlotDto>>() {

            /** One line per slot with its free bays. */
            @Override
            public void onSuccess(List<SlotDto> slots) {
                setBusy(false);
                showSlots(slots);
            }

            /** The slots could not be loaded. */
            @Override
            public void onError(ApiError error) {
                setBusy(false);
                if (!handledSessionEnd(error)) {
                    binding.stationSlotsEmpty.setText(error.message);
                    binding.stationSlotsEmpty.setVisibility(View.VISIBLE);
                }
            }
        });
    }

    /** Writes the slots of the chosen day. */
    private void showSlots(@Nullable List<SlotDto> slots) {
        binding.stationSlots.removeAllViews();
        if (slots == null || slots.isEmpty()) {
            binding.stationSlotsEmpty.setText(R.string.station_no_slots);
            binding.stationSlotsEmpty.setVisibility(View.VISIBLE);
            return;
        }
        for (SlotDto slot : slots) {
            ViewDetailRowBinding row = ViewDetailRowBinding.inflate(getLayoutInflater(), binding.stationSlots, true);
            row.rowLabel.setText(Times.timeRange(slot.startTime, slot.endTime));
            if (!slot.isOpen) {
                row.rowValue.setText(R.string.slot_closed);
            } else if (slot.availableBays <= 0) {
                row.rowValue.setText(R.string.slot_full);
                row.rowValue.setTextColor(ContextCompat.getColor(this, R.color.warning));
            } else {
                row.rowValue.setText(getResources().getQuantityString(R.plurals.slot_bays_free,
                        slot.capacity, slot.availableBays, slot.capacity));
                row.rowValue.setTextColor(ContextCompat.getColor(this, R.color.success));
            }
        }
    }

    /** Writes one label and value line. */
    private void row(ViewDetailRowBinding row, @StringRes int label, @Nullable String value) {
        row.rowLabel.setText(label);
        row.rowValue.setText(Texts.orDash(value));
    }

    /** Shows why the page may be old or empty. */
    private void showNotice(String message) {
        binding.stationNotice.setText(message);
        binding.stationNotice.setVisibility(View.VISIBLE);
    }

    /** Shows the progress bar while any request of this page is running. */
    private void setBusy(boolean busy) {
        requestsRunning = Math.max(0, requestsRunning + (busy ? 1 : -1));
        binding.stationProgress.setVisibility(requestsRunning > 0 ? View.VISIBLE : View.INVISIBLE);
    }
}
