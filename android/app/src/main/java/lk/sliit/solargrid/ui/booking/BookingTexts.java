/*
 * File:    BookingTexts.java
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: The words every booking screen uses: the direction of the energy,
 *          what happens next for each status, and until when a booking can
 *          still be changed. The API decides every rule; these sentences only
 *          explain its flags (canModify, hasQrCode, isPast) to the prosumer.
 */
package lk.sliit.solargrid.ui.booking;

import android.content.Context;

import androidx.annotation.Nullable;

import java.time.LocalDate;

import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.remote.dto.BookingRequests;
import lk.sliit.solargrid.data.remote.dto.ReservationDto;
import lk.sliit.solargrid.data.remote.dto.SlotDto;
import lk.sliit.solargrid.util.Texts;
import lk.sliit.solargrid.util.Times;

public final class BookingTexts {

    /** Nobody builds this class; it is only a set of helpers. */
    private BookingTexts() {
    }

    /** "Export (sell to the grid)" or "Import (charge from the grid)". */
    public static String trade(Context context, @Nullable String tradeType) {
        if (BookingRequests.EXPORT.equals(tradeType)) {
            return context.getString(R.string.trade_export_long);
        }
        if (BookingRequests.IMPORT.equals(tradeType)) {
            return context.getString(R.string.trade_import_long);
        }
        return Texts.orDash(tradeType);
    }

    /**
     * One sentence about what happens next with this booking. Staff get their
     * own words for a waiting or approved booking, because the next step is
     * theirs rather than the prosumer's.
     */
    public static String nextStep(Context context, ReservationDto booking, boolean forStaff) {
        String status = booking.status;
        if ("Approved".equals(status) && booking.isPast) {
            return context.getString(R.string.booking_next_missed);
        }
        if ("Pending".equals(status) && booking.isPast) {
            return context.getString(R.string.booking_next_expired);
        }
        if ("Pending".equals(status)) {
            return context.getString(forStaff ? R.string.booking_next_pending_staff : R.string.booking_next_pending);
        }
        if ("Approved".equals(status)) {
            return context.getString(forStaff ? R.string.booking_next_approved_staff : R.string.booking_next_approved);
        }
        if ("Completed".equals(status)) {
            return context.getString(R.string.booking_next_completed, Texts.kwh(booking.deliveredKwh));
        }
        if ("Cancelled".equals(status)) {
            return Texts.isBlank(booking.reason)
                    ? context.getString(R.string.booking_next_cancelled)
                    : context.getString(R.string.booking_next_cancelled_reason, booking.reason);
        }
        if ("Rejected".equals(status)) {
            return Texts.isBlank(booking.reason)
                    ? context.getString(R.string.booking_next_rejected)
                    : context.getString(R.string.booking_next_rejected_reason, booking.reason);
        }
        return "";
    }

    /**
     * Until when the booking can be changed or cancelled, or why it cannot any
     * more. Returns null for a finished booking, where the question is moot.
     */
    @Nullable
    public static String changeWindow(Context context, ReservationDto booking) {
        boolean open = "Pending".equals(booking.status) || "Approved".equals(booking.status);
        if (!open || booking.isPast) {
            return null;
        }
        if (booking.canModify) {
            return context.getString(R.string.booking_change_until, Times.dateTime(booking.modifyDeadline));
        }
        return context.getString(R.string.booking_change_closed);
    }

    /** "Today", "Tomorrow" or "Sun 20 Sept" on the day buttons. */
    public static String dayLabel(Context context, LocalDate day, LocalDate today) {
        if (day.equals(today)) {
            return context.getString(R.string.day_today);
        }
        if (day.equals(today.plusDays(1))) {
            return context.getString(R.string.day_tomorrow);
        }
        return Times.dayChip(day);
    }

    /** "08:00 - 10:00 · 3 of 12 bays free", or "· your booking" for the slot the booking already holds. */
    public static String slotLabel(Context context, SlotDto slot, boolean ownSlot) {
        String hours = Times.timeRange(slot.startTime, slot.endTime);
        String extra = ownSlot
                ? context.getString(R.string.wizard_own_slot)
                : context.getResources().getQuantityString(R.plurals.slot_bays_free,
                        slot.capacity, slot.availableBays, slot.capacity);
        return hours + " · " + extra;
    }

    /** "RSV-260918-HURV8 · 12.5 kWh · Export". */
    public static String shortLine(Context context, ReservationDto booking, boolean withProsumer) {
        String trade = BookingRequests.EXPORT.equals(booking.tradeType)
                ? context.getString(R.string.trade_export)
                : BookingRequests.IMPORT.equals(booking.tradeType)
                ? context.getString(R.string.trade_import)
                : Texts.orDash(booking.tradeType);
        String line = context.getString(R.string.booking_summary_line,
                Texts.orDash(booking.referenceNo), Texts.kwh(booking.energyKwh), trade);
        return withProsumer && !Texts.isBlank(booking.prosumerName)
                ? line + " · " + booking.prosumerName
                : line;
    }
}
