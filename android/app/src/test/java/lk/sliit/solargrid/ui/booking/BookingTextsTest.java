/*
 * File:    BookingTextsTest.java
 * Module:  Tests
 * Owner:   Hamnad
 * Purpose: Checks the sentences the booking screens build from the API's
 *          flags: what happens next for every status (for prosumers and for
 *          staff), until when a booking can be changed, and the labels of the
 *          day and slot buttons of the booking form.
 * Source:  AND-13 (Robolectric).
 */
package lk.sliit.solargrid.ui.booking;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import android.content.Context;

import androidx.test.core.app.ApplicationProvider;

import com.google.gson.Gson;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;

import java.time.LocalDate;

import lk.sliit.solargrid.data.remote.dto.ReservationDto;
import lk.sliit.solargrid.data.remote.dto.SlotDto;
import lk.sliit.solargrid.testing.Samples;
import lk.sliit.solargrid.util.Times;

@RunWith(RobolectricTestRunner.class)
public class BookingTextsTest {

    private static final Gson GSON = new Gson();

    private final Context context = ApplicationProvider.getApplicationContext();

    /** A waiting booking tells the prosumer the QR code comes after approval. */
    @Test
    public void explainsAWaitingBooking() {
        ReservationDto booking = booking("Pending", 30);

        assertTrue(BookingTexts.nextStep(context, booking, false).startsWith("Waiting for Backoffice approval."));
        assertEquals("Waiting for Backoffice approval.", BookingTexts.nextStep(context, booking, true));
    }

    /** An approved booking sends the prosumer to the station with the QR code. */
    @Test
    public void explainsAnApprovedBooking() {
        ReservationDto booking = booking("Approved", 30);

        assertTrue(BookingTexts.nextStep(context, booking, false).contains("Show the QR code"));
        assertTrue(BookingTexts.nextStep(context, booking, true).contains("scan it in the Scan tab"));
    }

    /** An approved booking whose slot is over was missed; a waiting one ran out of time. */
    @Test
    public void explainsBookingsWhoseSlotIsOver() {
        assertEquals("The slot ended without a check-in, so this booking was missed.",
                BookingTexts.nextStep(context, booking("Approved", -5), false));
        assertEquals("The slot ended before the booking was approved.",
                BookingTexts.nextStep(context, booking("Pending", -5), false));
    }

    /** Finished, cancelled and rejected bookings say what happened, with the reason. */
    @Test
    public void explainsFinishedBookings() {
        assertEquals("Finished: 12 kWh was delivered.", BookingTexts.nextStep(context, booking("Completed", -30), false));
        assertEquals("This booking was cancelled: Plans changed",
                BookingTexts.nextStep(context, booking("Cancelled", 30), false));
        assertEquals("The Backoffice rejected this booking: Station maintenance",
                BookingTexts.nextStep(context, booking("Rejected", 30), false));

        ReservationDto noReason = booking("Cancelled", 30);
        noReason.reason = null;
        assertEquals("This booking was cancelled and its bay was given back.",
                BookingTexts.nextStep(context, noReason, false));
    }

    /** While changes are allowed the deadline is named; after it, the rule is explained. */
    @Test
    public void namesTheLastMomentForChanges() {
        ReservationDto open = booking("Approved", 30);
        assertEquals("You can change or cancel this booking until " + Times.dateTime(open.modifyDeadline) + ".",
                BookingTexts.changeWindow(context, open));

        ReservationDto closed = booking("Approved", 5);
        assertEquals("Changes and cancellations closed 12 hours before the start.",
                BookingTexts.changeWindow(context, closed));
    }

    /** Finished bookings have nothing left to change. */
    @Test
    public void saysNothingAboutChangesForFinishedBookings() {
        assertNull(BookingTexts.changeWindow(context, booking("Completed", -30)));
        assertNull(BookingTexts.changeWindow(context, booking("Cancelled", 30)));
        assertNull(BookingTexts.changeWindow(context, booking("Approved", -5)));
    }

    /** The direction is written out in full. */
    @Test
    public void writesTheDirectionInFull() {
        assertEquals("Export - sell spare solar energy", BookingTexts.trade(context, "Export"));
        assertEquals("Import - take stored energy", BookingTexts.trade(context, "Import"));
        assertEquals("-", BookingTexts.trade(context, null));
    }

    /** The first two day buttons say "Today" and "Tomorrow", the others the date. */
    @Test
    public void labelsTheDayButtons() {
        LocalDate today = LocalDate.of(2026, 9, 18);

        assertEquals("Today", BookingTexts.dayLabel(context, today, today));
        assertEquals("Tomorrow", BookingTexts.dayLabel(context, today.plusDays(1), today));
        assertEquals("Sun 20 Sept", BookingTexts.dayLabel(context, today.plusDays(2), today));
    }

    /** A slot button shows its hours and free bays, or that the booking already holds it. */
    @Test
    public void labelsTheSlotButtons() {
        SlotDto slot = new SlotDto();
        slot.startTime = "2026-09-20T02:30:00Z";
        slot.endTime = "2026-09-20T04:30:00Z";
        slot.capacity = 5;
        slot.availableBays = 3;

        assertEquals("08:00 - 10:00 · 3 of 5 bays free", BookingTexts.slotLabel(context, slot, false));
        assertEquals("08:00 - 10:00 · your booking", BookingTexts.slotLabel(context, slot, true));
    }

    /** Operators see whose booking a card is. */
    @Test
    public void addsTheProsumerForOperators() {
        ReservationDto booking = booking("Approved", 30);

        assertEquals("RSV-260918-HURV8 · 12.5 kWh · Export", BookingTexts.shortLine(context, booking, false));
        assertEquals("RSV-260918-HURV8 · 12.5 kWh · Export · Kasun Perera", BookingTexts.shortLine(context, booking, true));
    }

    /** The sample booking with the status and start the test needs. */
    private static ReservationDto booking(String status, long startsInHours) {
        return GSON.fromJson(Samples.booking(status, startsInHours), ReservationDto.class);
    }
}
