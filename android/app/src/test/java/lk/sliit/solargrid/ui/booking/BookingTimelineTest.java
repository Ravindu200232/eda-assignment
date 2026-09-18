/*
 * File:    BookingTimelineTest.java
 * Module:  Tests
 * Owner:   Hamnad
 * Purpose: Checks the history steps of a booking: their order, which steps
 *          each status has, and who is named for each step - "you" for the
 *          viewer, and staff NICs only for staff.
 * Source:  AND-13 (Robolectric).
 */
package lk.sliit.solargrid.ui.booking;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.content.Context;

import androidx.test.core.app.ApplicationProvider;

import com.google.gson.Gson;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import lk.sliit.solargrid.data.remote.dto.ReservationDto;
import lk.sliit.solargrid.testing.Samples;

@RunWith(RobolectricTestRunner.class)
public class BookingTimelineTest {

    private static final Gson GSON = new Gson();
    private static final String OPERATOR_NIC = "198800001111";

    private final Context context = ApplicationProvider.getApplicationContext();

    /** An approved booking to come: booked, approved, changes close, the transfer starts. */
    @Test
    public void listsTheStepsOfAnApprovedBookingInOrder() {
        List<BookingTimeline.Step> steps = steps(booking("Approved", 30), Samples.MY_NIC);

        assertEquals(List.of("Booked", "Approved", "Changes close", "Energy transfer starts"), titles(steps));
        assertEquals("By you", steps.get(0).detail);
        assertEquals("By SolarGrid staff · QR code issued", steps.get(1).detail);
        assertTrue(steps.get(0).done);
        assertFalse(steps.get(3).done);
    }

    /** A cancelled booking names who cancelled it and why, and has no coming steps. */
    @Test
    public void explainsACancellation() {
        List<BookingTimeline.Step> steps = steps(booking("Cancelled", 30), Samples.MY_NIC);

        assertEquals(List.of("Booked", "Cancelled"), titles(steps));
        assertEquals("By you · Plans changed", steps.get(1).detail);
    }

    /** A rejected booking shows the Backoffice's reason. */
    @Test
    public void showsTheReasonOfARejection() {
        List<BookingTimeline.Step> steps = steps(booking("Rejected", 30), Samples.MY_NIC);

        assertEquals(List.of("Booked", "Rejected"), titles(steps));
        assertEquals("Station maintenance", steps.get(1).detail);
    }

    /** A finished transfer ends with the delivered energy. */
    @Test
    public void endsAFinishedTransferWithTheEnergy() {
        List<BookingTimeline.Step> steps = steps(booking("Completed", -30), Samples.MY_NIC);

        assertEquals(List.of("Booked", "Approved", "Energy transfer starts", "Completed"), titles(steps));
        assertEquals("12 kWh delivered", steps.get(3).detail);
    }

    /** An approved booking whose slot ended without a check-in ends as missed. */
    @Test
    public void marksAMissedBooking() {
        List<String> titles = titles(steps(booking("Approved", -5), Samples.MY_NIC));

        assertEquals("Missed", titles.get(titles.size() - 1));
        assertFalse(titles.contains("Changes close"));
    }

    /** Staff see the prosumer as "the prosumer" and other staff by their NIC. */
    @Test
    public void namesPeopleForStaff() {
        List<BookingTimeline.Step> steps = steps(booking("Approved", 30), OPERATOR_NIC);

        assertEquals("By the prosumer", steps.get(0).detail);
        assertEquals("By staff member 199001234567 · QR code issued", steps.get(1).detail);
    }

    /** The history of a booking as seen by the given user. */
    private List<BookingTimeline.Step> steps(ReservationDto booking, String viewerNic) {
        return BookingTimeline.of(context, booking, viewerNic, Instant.now());
    }

    /** The titles of the steps, in order. */
    private static List<String> titles(List<BookingTimeline.Step> steps) {
        List<String> titles = new ArrayList<>();
        for (BookingTimeline.Step step : steps) {
            titles.add(step.title);
        }
        return titles;
    }

    /** The sample booking with the status and start the test needs. */
    private static ReservationDto booking(String status, long startsInHours) {
        return GSON.fromJson(Samples.booking(status, startsInHours), ReservationDto.class);
    }
}
