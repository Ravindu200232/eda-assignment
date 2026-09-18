/*
 * File:    BookingTimeline.java
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: The history of one booking as a list of dated steps: booked,
 *          approved or rejected, cancelled, the last moment for changes, the
 *          start of the transfer, completed or missed. It follows the
 *          timeline of the web portal, so both apps tell the same story.
 */
package lk.sliit.solargrid.ui.booking;

import android.content.Context;

import androidx.annotation.Nullable;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.remote.dto.ReservationDto;
import lk.sliit.solargrid.util.Texts;
import lk.sliit.solargrid.util.Times;

public final class BookingTimeline {

    /** One step of the history. */
    public static class Step {

        public final String title;
        public final String at;
        public final String detail;

        /** True when the moment has already come. */
        public final boolean done;

        /** Keeps the words and the time of one step. */
        Step(String title, String at, String detail, boolean done) {
            this.title = title;
            this.at = at;
            this.detail = detail;
            this.done = done;
        }
    }

    /** Nobody builds this class; it is only a helper. */
    private BookingTimeline() {
    }

    /**
     * The steps of a booking, oldest first. The viewer's NIC decides whether
     * a step says "by you", "by the prosumer" or "by staff".
     */
    public static List<Step> of(Context context, ReservationDto booking, @Nullable String viewerNic, Instant now) {
        List<Step> steps = new ArrayList<>();
        boolean live = "Pending".equals(booking.status) || "Approved".equals(booking.status);

        add(steps, context.getString(R.string.timeline_booked), booking.createdAt,
                by(context, booking.createdBy, booking, viewerNic), now);
        if (booking.approvedAt != null) {
            add(steps, context.getString(R.string.timeline_approved), booking.approvedAt,
                    context.getString(R.string.timeline_approved_detail,
                            by(context, booking.approvedBy, booking, viewerNic)), now);
        }
        if (booking.rejectedAt != null) {
            add(steps, context.getString(R.string.timeline_rejected), booking.rejectedAt,
                    Texts.isBlank(booking.reason) ? context.getString(R.string.timeline_no_reason) : booking.reason, now);
        }
        if (booking.cancelledAt != null) {
            String who = by(context, booking.cancelledBy, booking, viewerNic);
            add(steps, context.getString(R.string.timeline_cancelled), booking.cancelledAt,
                    Texts.isBlank(booking.reason) ? who : who + " · " + booking.reason, now);
        }
        if (live && !booking.isPast) {
            add(steps, context.getString(R.string.timeline_deadline), booking.modifyDeadline,
                    context.getString(R.string.timeline_deadline_detail), now);
        }
        if (live || "Completed".equals(booking.status)) {
            add(steps, context.getString(R.string.timeline_starts), booking.startTime,
                    context.getString(R.string.timeline_starts_detail, Texts.orDash(booking.stationName)), now);
        }
        if (booking.completedAt != null) {
            add(steps, context.getString(R.string.timeline_completed), booking.completedAt,
                    context.getString(R.string.timeline_completed_detail, Texts.kwh(booking.deliveredKwh)), now);
        }
        if (live && booking.isPast) {
            add(steps, context.getString(R.string.timeline_missed), booking.endTime,
                    context.getString(R.string.timeline_missed_detail), now);
        }

        steps.sort(Comparator.comparing(step -> Times.toInstant(step.at)));
        return steps;
    }

    /** Adds a step when its time can be read; a step without a time is left out. */
    private static void add(List<Step> steps, String title, @Nullable String at, String detail, Instant now) {
        Instant moment = Times.toInstant(at);
        if (moment != null) {
            steps.add(new Step(title, at, detail, !moment.isAfter(now)));
        }
    }

    /**
     * "By you", "By the prosumer" or who on the staff did it. Prosumers only
     * see "SolarGrid staff"; operators see the staff member's NIC, as the
     * web portal shows it to staff.
     */
    static String by(Context context, @Nullable String nic, ReservationDto booking, @Nullable String viewerNic) {
        if (Texts.isBlank(nic)) {
            return context.getString(R.string.timeline_by_unknown);
        }
        if (nic.equals(viewerNic)) {
            return context.getString(R.string.timeline_by_you);
        }
        if (nic.equals(booking.prosumerNic)) {
            return context.getString(R.string.timeline_by_prosumer);
        }
        if (viewerNic != null && viewerNic.equals(booking.prosumerNic)) {
            return context.getString(R.string.timeline_by_staff);
        }
        return context.getString(R.string.timeline_by_staff_member, nic);
    }
}
