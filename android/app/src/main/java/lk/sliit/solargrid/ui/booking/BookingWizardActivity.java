/*
 * File:    BookingWizardActivity.java
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: Books a slot, or changes a booking, in four steps: the station,
 *          a day in the next seven days and one of its free slots, the energy
 *          and its direction (Export or Import), and a review. The API checks
 *          every rule (7 days ahead, 12 hours' notice, a free bay, the energy
 *          one bay can hold, no two bookings at once) and its message is
 *          shown when it says no. Success always ends on the summary screen.
 * Source:  AND-25 (RecyclerView lists), AND-30 (chips), AND-33 (step bar),
 *          AND-35 (back button and keeping the choices).
 */
package lk.sliit.solargrid.ui.booking;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.inputmethod.EditorInfo;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.StringRes;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.google.android.material.chip.Chip;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.remote.ApiCallback;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.data.remote.dto.BookingRequests;
import lk.sliit.solargrid.data.remote.dto.ReservationDto;
import lk.sliit.solargrid.data.remote.dto.SlotDto;
import lk.sliit.solargrid.data.remote.dto.StationDto;
import lk.sliit.solargrid.data.repo.CachedCallback;
import lk.sliit.solargrid.databinding.ActivityBookingWizardBinding;
import lk.sliit.solargrid.databinding.ViewDetailRowBinding;
import lk.sliit.solargrid.ui.common.BaseActivity;
import lk.sliit.solargrid.ui.common.Forms;
import lk.sliit.solargrid.ui.map.StationAdapter;
import lk.sliit.solargrid.ui.map.StationDetailsActivity;
import lk.sliit.solargrid.ui.map.StationTexts;
import lk.sliit.solargrid.util.Texts;
import lk.sliit.solargrid.util.Times;

public class BookingWizardActivity extends BaseActivity {

    static final int STEP_STATION = 1;
    static final int STEP_SLOT = 2;
    static final int STEP_ENERGY = 3;
    static final int STEP_REVIEW = 4;

    private static final String EXTRA_STATION_ID = "stationId";
    private static final String EXTRA_BOOKING_ID = "bookingId";

    private static final String STATE_STEP = "step";
    private static final String STATE_STATION_ID = "stationId";
    private static final String STATE_DAY = "day";
    private static final String STATE_SLOT_ID = "slotId";

    private ActivityBookingWizardBinding binding;
    private final StationAdapter stationAdapter = new StationAdapter(this::chooseStation);

    /** Set when an existing booking is being changed. */
    @Nullable
    private String bookingId;
    @Nullable
    private ReservationDto booking;

    @Nullable
    private StationDto station;
    @Nullable
    private LocalDate day;
    @Nullable
    private SlotDto slot;

    /** A slot to choose again once the slots of the day have loaded. */
    @Nullable
    private String wantedSlotId;

    private int step = STEP_STATION;
    private int firstStep = STEP_STATION;
    private boolean restored;
    private boolean locked;
    private boolean sending;
    private int requestsRunning;

    /** Opens the form for a new booking, at a station when one is given. */
    public static Intent forNewBooking(Context context, @Nullable String stationId) {
        Intent intent = new Intent(context, BookingWizardActivity.class);
        if (stationId != null) {
            intent.putExtra(EXTRA_STATION_ID, stationId);
        }
        return intent;
    }

    /** Opens the form to change a booking. */
    public static Intent forChange(Context context, String bookingId) {
        return new Intent(context, BookingWizardActivity.class).putExtra(EXTRA_BOOKING_ID, bookingId);
    }

    /** Builds the form and starts at the first step it needs. */
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityBookingWizardBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        leaveRoomForSystemBars(binding.getRoot());

        bookingId = getIntent().getStringExtra(EXTRA_BOOKING_ID);
        String stationId = getIntent().getStringExtra(EXTRA_STATION_ID);
        int wantedStep = stationId == null && bookingId == null ? STEP_STATION : STEP_SLOT;
        firstStep = wantedStep;
        if (savedInstanceState != null) {
            restored = true;
            wantedStep = savedInstanceState.getInt(STATE_STEP, wantedStep);
            stationId = savedInstanceState.getString(STATE_STATION_ID, stationId);
            String dayText = savedInstanceState.getString(STATE_DAY);
            day = dayText == null ? null : LocalDate.parse(dayText);
            wantedSlotId = savedInstanceState.getString(STATE_SLOT_ID);
        }

        binding.wizardStations.setLayoutManager(new LinearLayoutManager(this));
        binding.wizardStations.setAdapter(stationAdapter);
        binding.wizardSearch.setOnEditorActionListener((view, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_SEARCH) {
                searchStations(Forms.text(binding.wizardSearch));
                return true;
            }
            return false;
        });
        binding.wizardSearchBox.setEndIconOnClickListener(view -> {
            binding.wizardSearch.setText("");
            searchStations(null);
        });
        binding.wizardOtherStation.setOnClickListener(view -> {
            showStep(STEP_STATION);
            if (stationAdapter.getItemCount() == 0) {
                searchStations(null);
            }
        });
        binding.wizardSlots.setOnCheckedStateChangeListener((group, checkedIds) -> {
            View chip = checkedIds.isEmpty() ? null : group.findViewById(checkedIds.get(0));
            slot = chip == null ? null : (SlotDto) chip.getTag();
        });
        binding.wizardTrade.setOnCheckedStateChangeListener((group, checkedIds) -> showTradeHint());
        binding.wizardClose.setOnClickListener(view -> finish());
        binding.wizardPrevious.setOnClickListener(view -> goBack());
        binding.wizardNext.setOnClickListener(view -> goForward());
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {

            /** The system back gesture moves one step back, like the Back button. */
            @Override
            public void handleOnBackPressed() {
                goBack();
            }
        });

        showStep(wantedStep);
        String firstStation = stationId;
        int stepToShow = wantedStep;
        withLocalNetwork(() -> start(firstStation, stepToShow), () -> {
            problem(getString(R.string.local_network_refused));
            lock();
        });
    }

    /** Keeps the choices when the phone is turned or the app is sent to the background. */
    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        outState.putInt(STATE_STEP, step);
        if (station != null) {
            outState.putString(STATE_STATION_ID, station.id);
        }
        if (day != null) {
            outState.putString(STATE_DAY, day.toString());
        }
        String slotId = slot != null ? slot.id : wantedSlotId;
        if (slotId != null) {
            outState.putString(STATE_SLOT_ID, slotId);
        }
    }

    /** Loads what the first step needs: the booking, the station, or the station list. */
    private void start(@Nullable String stationId, int wantedStep) {
        if (bookingId != null && booking == null) {
            loadBooking(stationId, wantedStep);
            return;
        }
        if (stationId == null || wantedStep == STEP_STATION) {
            showStep(STEP_STATION);
            searchStations(null);
            if (stationId != null) {
                loadStation(stationId, STEP_STATION);
            }
            return;
        }
        loadStation(stationId, wantedStep);
    }

    /**
     * Loads the booking that is being changed. Only the server knows whether
     * it may still be changed, so a copy saved on the phone is not enough.
     */
    private void loadBooking(@Nullable String stationId, int wantedStep) {
        setBusy(true);
        app().reservations().get(bookingId, new CachedCallback<ReservationDto>() {

            /** Starts the form from the booking, unless it can no longer be changed. */
            @Override
            public void onResult(ReservationDto result, @Nullable ApiError offlineReason) {
                setBusy(false);
                if (offlineReason != null) {
                    problem(getString(R.string.wizard_change_offline, offlineReason.message));
                    lock();
                    return;
                }
                if (result == null) {
                    problem(getString(R.string.error_generic));
                    lock();
                    return;
                }
                if (!result.canModify) {
                    problem(getString(R.string.wizard_locked, Times.dateTime(result.modifyDeadline)));
                    lock();
                    return;
                }
                booking = result;
                if (!restored) {
                    day = Times.dayOf(result.startTime);
                    wantedSlotId = result.slotId;
                    binding.wizardEnergy.setText(Texts.number(result.energyKwh));
                    binding.wizardTradeExport.setChecked(BookingRequests.EXPORT.equals(result.tradeType));
                    binding.wizardTradeImport.setChecked(BookingRequests.IMPORT.equals(result.tradeType));
                }
                showStep(step);
                start(stationId != null ? stationId : result.stationId, wantedStep);
            }

            /** The booking could not be loaded at all. */
            @Override
            public void onError(ApiError error) {
                setBusy(false);
                if (!handledSessionEnd(error)) {
                    problem(error.message);
                    lock();
                }
            }
        });
    }

    /** Stations whose name, code or address contains the text (all of them for none). */
    private void searchStations(@Nullable String text) {
        setBusy(true);
        app().stations().search(text, new CachedCallback<List<StationDto>>() {

            /** Fills the list; saved stations are fine for choosing one. */
            @Override
            public void onResult(List<StationDto> stations, @Nullable ApiError offlineReason) {
                setBusy(false);
                stationAdapter.show(stations);
                binding.wizardStationsEmpty.setVisibility(stations.isEmpty() ? View.VISIBLE : View.GONE);
                if (offlineReason != null) {
                    problem(getString(R.string.stations_offline, offlineReason.message));
                }
            }

            /** The list could not be loaded. */
            @Override
            public void onError(ApiError error) {
                setBusy(false);
                if (!handledSessionEnd(error)) {
                    problem(error.message);
                }
            }
        });
    }

    /** Loads one station, then shows its days. */
    private void loadStation(String stationId, int wantedStep) {
        setBusy(true);
        app().stations().station(stationId, new CachedCallback<StationDto>() {

            /** Uses the station; the slots after it always come from the API. */
            @Override
            public void onResult(StationDto result, @Nullable ApiError offlineReason) {
                setBusy(false);
                if (result == null) {
                    problem(getString(R.string.error_generic));
                    return;
                }
                useStation(result, wantedStep);
            }

            /** The station is closed or gone; the list of stations is offered instead. */
            @Override
            public void onError(ApiError error) {
                setBusy(false);
                if (handledSessionEnd(error)) {
                    return;
                }
                problem(error.message);
                showStep(STEP_STATION);
                if (stationAdapter.getItemCount() == 0) {
                    searchStations(null);
                }
            }
        });
    }

    /** A station was tapped in the list. */
    private void chooseStation(StationDto chosen) {
        clearProblem();
        if (station == null || !station.id.equals(chosen.id)) {
            slot = null;
            wantedSlotId = booking != null && chosen.id.equals(booking.stationId) ? booking.slotId : null;
        }
        useStation(chosen, STEP_SLOT);
    }

    /** Writes the station at the top of step 2 and loads the days. */
    private void useStation(StationDto chosen, int wantedStep) {
        station = chosen;
        binding.wizardStationName.setText(chosen.name);
        binding.wizardStationWhere.setText(StationTexts.where(this, chosen));
        binding.wizardStationEnergy.setText(StationTexts.energy(this, chosen));
        binding.wizardEnergyBox.setHelperText(getString(R.string.wizard_energy_hint, Texts.number(chosen.bayCapacityKwh)));
        if (wantedStep != STEP_STATION) {
            showStep(wantedStep);
        }
        addDayButtons();
    }

    /**
     * Today and the six days after it: bookings may be made up to seven days
     * ahead. A booking being changed keeps its own day on the list as well.
     */
    private void addDayButtons() {
        binding.wizardDays.removeAllViews();
        LocalDate today = Times.today();
        List<LocalDate> days = new ArrayList<>();
        for (int offset = 0; offset < StationDetailsActivity.DAYS_SHOWN; offset++) {
            days.add(today.plusDays(offset));
        }
        LocalDate ownDay = booking == null ? null : Times.dayOf(booking.startTime);
        if (ownDay != null && !ownDay.isBefore(today) && !days.contains(ownDay)) {
            days.add(ownDay);
        }
        if (day == null || !days.contains(day)) {
            day = today;
        }

        Chip chosenChip = null;
        for (LocalDate each : days) {
            Chip chip = new Chip(this);
            chip.setId(View.generateViewId());
            chip.setSaveEnabled(false);
            chip.setCheckable(true);
            chip.setText(BookingTexts.dayLabel(this, each, today));
            chip.setOnCheckedChangeListener((button, checked) -> {
                if (checked) {
                    chooseDay(each);
                }
            });
            binding.wizardDays.addView(chip);
            if (each.equals(day)) {
                chosenChip = chip;
            }
        }
        if (chosenChip != null) {
            chosenChip.setChecked(true);
        }
    }

    /** A day was chosen; its free slots are loaded. */
    private void chooseDay(LocalDate chosen) {
        if (!chosen.equals(day)) {
            slot = null;
        }
        day = chosen;
        loadSlots();
    }

    /** Asks the API for the slots of the chosen day that can still be booked. */
    private void loadSlots() {
        if (station == null || day == null) {
            return;
        }
        String stationId = station.id;
        LocalDate forDay = day;
        if (slot != null && wantedSlotId == null) {
            wantedSlotId = slot.id;
        }
        binding.wizardSlots.removeAllViews();
        binding.wizardSlotsEmpty.setVisibility(View.GONE);
        setBusy(true);
        app().stations().slots(stationId, forDay, new ApiCallback<List<SlotDto>>() {

            /** Offers the slots, unless another day was chosen in the meantime. */
            @Override
            public void onSuccess(List<SlotDto> slots) {
                setBusy(false);
                if (isStillWanted(stationId, forDay)) {
                    showSlots(slots == null ? new ArrayList<>() : slots);
                }
            }

            /** The slots could not be loaded. */
            @Override
            public void onError(ApiError error) {
                setBusy(false);
                if (handledSessionEnd(error) || !isStillWanted(stationId, forDay)) {
                    return;
                }
                binding.wizardSlotsEmpty.setText(error.message);
                binding.wizardSlotsEmpty.setVisibility(View.VISIBLE);
            }
        });
    }

    /** True when the answer is for the station and day on screen. */
    private boolean isStillWanted(String stationId, LocalDate forDay) {
        return station != null && station.id.equals(stationId) && forDay.equals(day);
    }

    /** One button for each slot; the one chosen before is chosen again. */
    private void showSlots(List<SlotDto> freeSlots) {
        List<SlotDto> choices = SlotChoices.forDay(freeSlots, booking, station.id, day);
        String keep = wantedSlotId;
        wantedSlotId = null;
        slot = null;
        binding.wizardSlots.removeAllViews();

        Chip chosenChip = null;
        for (SlotDto choice : choices) {
            Chip chip = new Chip(this);
            chip.setId(View.generateViewId());
            chip.setSaveEnabled(false);
            chip.setCheckable(true);
            chip.setText(BookingTexts.slotLabel(this, choice, SlotChoices.isOwn(choice, booking)));
            chip.setTag(choice);
            binding.wizardSlots.addView(chip);
            if (choice.id != null && choice.id.equals(keep)) {
                chosenChip = chip;
            }
        }
        binding.wizardSlotsEmpty.setText(R.string.wizard_no_slots);
        binding.wizardSlotsEmpty.setVisibility(choices.isEmpty() ? View.VISIBLE : View.GONE);

        if (chosenChip != null) {
            chosenChip.setChecked(true);
        } else if (keep != null && step > STEP_SLOT) {
            // The slot filled up or started while the form was open.
            showStep(STEP_SLOT);
            problem(getString(R.string.wizard_slot_gone));
        }
    }

    /** Explains the chosen direction under the two buttons. */
    private void showTradeHint() {
        String trade = tradeType();
        binding.wizardTradeHint.setText(BookingRequests.EXPORT.equals(trade) ? R.string.wizard_trade_export_hint
                : BookingRequests.IMPORT.equals(trade) ? R.string.wizard_trade_import_hint
                : R.string.wizard_trade_hint);
        if (trade != null) {
            binding.wizardTradeError.setVisibility(View.GONE);
        }
    }

    /** "Export", "Import" or null when neither is chosen. */
    @Nullable
    private String tradeType() {
        if (binding.wizardTradeExport.isChecked()) {
            return BookingRequests.EXPORT;
        }
        if (binding.wizardTradeImport.isChecked()) {
            return BookingRequests.IMPORT;
        }
        return null;
    }

    /** The Next button: checks the step, then moves on or sends the booking. */
    private void goForward() {
        if (locked || sending) {
            return;
        }
        clearProblem();
        if (step == STEP_STATION) {
            if (station == null) {
                problem(getString(R.string.wizard_station_missing));
                return;
            }
            showStep(STEP_SLOT);
        } else if (step == STEP_SLOT) {
            if (slot == null) {
                problem(getString(R.string.wizard_slot_missing));
                return;
            }
            showStep(STEP_ENERGY);
        } else if (step == STEP_ENERGY) {
            if (checkEnergyAndTrade()) {
                showReview();
                showStep(STEP_REVIEW);
            }
        } else {
            send();
        }
    }

    /** The Back button: one step back, or leave the form from its first step. */
    private void goBack() {
        if (sending) {
            return;
        }
        if (locked) {
            finish();
        } else if (step == STEP_STATION) {
            if (firstStep == STEP_STATION || station == null) {
                finish();
            } else {
                showStep(STEP_SLOT);
            }
        } else if (step == STEP_SLOT && firstStep != STEP_STATION) {
            finish();
        } else {
            clearProblem();
            showStep(step - 1);
        }
    }

    /**
     * Checks that a number and a direction were given. The limit of one bay
     * is also checked by the API; here it only saves a trip to the server.
     */
    private boolean checkEnergyAndTrade() {
        boolean ready = true;
        Double energy = Forms.number(binding.wizardEnergy);
        if (energy == null || energy.isNaN() || energy <= 0) {
            binding.wizardEnergyBox.setError(getString(R.string.wizard_energy_missing));
            ready = false;
        } else if (station != null && energy > station.bayCapacityKwh) {
            binding.wizardEnergyBox.setError(getString(R.string.wizard_energy_too_much, Texts.number(station.bayCapacityKwh)));
            ready = false;
        } else {
            binding.wizardEnergyBox.setError(null);
        }
        if (tradeType() == null) {
            binding.wizardTradeError.setVisibility(View.VISIBLE);
            ready = false;
        }
        return ready;
    }

    /** Fills the review card with the choices. */
    private void showReview() {
        row(binding.reviewStationRow, R.string.booking_station, station == null ? null : station.name);
        row(binding.reviewSlotRow, R.string.booking_slot, slot == null ? null : Times.slot(slot.startTime, slot.endTime));
        row(binding.reviewEnergyRow, R.string.booking_energy, Texts.kwh(Forms.number(binding.wizardEnergy)));
        row(binding.reviewTradeRow, R.string.booking_trade, BookingTexts.trade(this, tradeType()));
        binding.reviewNote.setText(booking == null ? R.string.wizard_review_new : R.string.wizard_review_change);
    }

    /** Sends the booking (or the change) and opens the summary with the API's answer. */
    private void send() {
        Double energy = Forms.number(binding.wizardEnergy);
        String trade = tradeType();
        if (station == null || slot == null) {
            showStep(STEP_SLOT);
            return;
        }
        if (energy == null || energy.isNaN() || trade == null) {
            showStep(STEP_ENERGY);
            checkEnergyAndTrade();
            return;
        }

        BookingRequests.Booking request = new BookingRequests.Booking(slot.id, energy, trade);
        ApiCallback<ReservationDto> answer = new ApiCallback<ReservationDto>() {

            /** Saved: the summary screen takes over. */
            @Override
            public void onSuccess(ReservationDto saved) {
                setSending(false);
                if (saved == null) {
                    problem(getString(R.string.error_generic));
                    return;
                }
                startActivity(BookingResultActivity.intentFor(BookingWizardActivity.this,
                        booking == null ? BookingResultActivity.CREATED : BookingResultActivity.CHANGED, saved));
                finish();
            }

            /** The API said no; its message says why. */
            @Override
            public void onError(ApiError error) {
                setSending(false);
                if (!handledSessionEnd(error)) {
                    showRefusal(error);
                }
            }
        };

        setSending(true);
        if (booking == null) {
            app().reservations().create(request, answer);
        } else {
            app().reservations().update(booking.id, request, answer);
        }
    }

    /**
     * Shows why the booking was refused and goes to the step that can fix it.
     * A conflict means the slot filled up, or the prosumer already has a
     * booking then, so the slots are loaded again.
     */
    private void showRefusal(ApiError error) {
        problem(error.message);
        String energyProblem = error.fieldError("energyKwh");
        String tradeProblem = error.fieldError("tradeType");
        if (energyProblem != null || tradeProblem != null) {
            binding.wizardEnergyBox.setError(energyProblem);
            binding.wizardTradeError.setVisibility(tradeProblem == null ? View.GONE : View.VISIBLE);
            showStep(STEP_ENERGY);
        } else if (error.fieldError("slotId") != null || error.status == 409) {
            showStep(STEP_SLOT);
            loadSlots();
        }
    }

    /** Shows one step and hides the others. */
    private void showStep(int newStep) {
        step = newStep;
        binding.wizardStepStation.setVisibility(newStep == STEP_STATION && !locked ? View.VISIBLE : View.GONE);
        binding.wizardStepSlot.setVisibility(newStep == STEP_SLOT && !locked ? View.VISIBLE : View.GONE);
        binding.wizardStepEnergy.setVisibility(newStep == STEP_ENERGY && !locked ? View.VISIBLE : View.GONE);
        binding.wizardStepReview.setVisibility(newStep == STEP_REVIEW && !locked ? View.VISIBLE : View.GONE);

        binding.wizardSteps.setProgressCompat(newStep, true);
        binding.wizardStepLabel.setText(bookingId == null
                ? getString(R.string.wizard_step_new, newStep, STEP_REVIEW)
                : getString(R.string.wizard_step_change, newStep, STEP_REVIEW));
        binding.wizardTitle.setText(newStep == STEP_STATION ? R.string.wizard_title_station
                : newStep == STEP_SLOT ? R.string.wizard_title_slot
                : newStep == STEP_ENERGY ? R.string.wizard_title_energy
                : R.string.wizard_title_review);
        binding.wizardNext.setText(newStep != STEP_REVIEW ? R.string.wizard_next
                : bookingId == null ? R.string.wizard_book : R.string.wizard_save);
        binding.wizardNext.setIconResource(newStep == STEP_REVIEW ? R.drawable.ic_check : R.drawable.ic_arrow_right);
    }

    /** Stops the form when the booking cannot be changed; only leaving is left. */
    private void lock() {
        locked = true;
        showStep(step);
        binding.wizardNext.setEnabled(false);
    }

    /** Turns the buttons off while the booking is being sent. */
    private void setSending(boolean busy) {
        sending = busy;
        setBusy(busy);
        binding.wizardNext.setEnabled(!busy && !locked);
        binding.wizardPrevious.setEnabled(!busy);
    }

    /** Writes one label and value line. */
    private void row(ViewDetailRowBinding row, @StringRes int label, @Nullable String value) {
        row.rowLabel.setText(label);
        row.rowValue.setText(Texts.orDash(value));
    }

    /** Shows why something did not work, above the step. */
    private void problem(String message) {
        binding.wizardNotice.setText(message);
        binding.wizardNotice.setVisibility(View.VISIBLE);
    }

    /** Hides the message above the step. */
    private void clearProblem() {
        binding.wizardNotice.setVisibility(View.GONE);
    }

    /** Shows the progress bar while any request of this form is running. */
    private void setBusy(boolean busy) {
        requestsRunning = Math.max(0, requestsRunning + (busy ? 1 : -1));
        binding.wizardProgress.setVisibility(requestsRunning > 0 ? View.VISIBLE : View.INVISIBLE);
    }
}
