/*
 * File:    SlotChoicesTest.java
 * Module:  Tests
 * Owner:   Hamnad
 * Purpose: Checks which slots the booking form offers: the free slots from
 *          the API, earliest first, plus the booking's own slot when a
 *          booking is being changed on its own day and station.
 */
package lk.sliit.solargrid.ui.booking;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import lk.sliit.solargrid.data.remote.dto.ReservationDto;
import lk.sliit.solargrid.data.remote.dto.SlotDto;

public class SlotChoicesTest {

    private static final LocalDate DAY = LocalDate.of(2026, 9, 20);

    /** Without a booking to change, the free slots are offered earliest first. */
    @Test
    public void offersTheFreeSlotsEarliestFirst() {
        List<SlotDto> choices = SlotChoices.forDay(List.of(slot("sl-10", "04:30"), slot("sl-8", "02:30")),
                null, "st-mal", DAY);

        assertEquals(List.of("sl-8", "sl-10"), ids(choices));
    }

    /** The slot a booking already holds is offered again, even when the API left it out as full. */
    @Test
    public void addsTheOwnSlotOfTheBooking() {
        ReservationDto booking = booking("sl-12", "06:30");

        List<SlotDto> choices = SlotChoices.forDay(List.of(slot("sl-8", "02:30"), slot("sl-14", "08:30")),
                booking, "st-mal", DAY);

        assertEquals(List.of("sl-8", "sl-12", "sl-14"), ids(choices));
        assertTrue(SlotChoices.isOwn(choices.get(1), booking));
        assertFalse(SlotChoices.isOwn(choices.get(0), booking));
    }

    /** The own slot is not added twice when it still has free bays. */
    @Test
    public void doesNotRepeatTheOwnSlot() {
        ReservationDto booking = booking("sl-8", "02:30");

        List<SlotDto> choices = SlotChoices.forDay(List.of(slot("sl-8", "02:30")), booking, "st-mal", DAY);

        assertEquals(List.of("sl-8"), ids(choices));
    }

    /** On another day or at another station the own slot is not offered. */
    @Test
    public void keepsTheOwnSlotToItsDayAndStation() {
        ReservationDto booking = booking("sl-12", "06:30");

        assertTrue(SlotChoices.forDay(new ArrayList<>(), booking, "st-mal", DAY.plusDays(1)).isEmpty());
        assertTrue(SlotChoices.forDay(new ArrayList<>(), booking, "st-col", DAY).isEmpty());
    }

    /** A slot on 20 September starting at the given UTC time, two hours long. */
    private static SlotDto slot(String id, String utcTime) {
        SlotDto slot = new SlotDto();
        slot.id = id;
        slot.stationId = "st-mal";
        slot.startTime = "2026-09-20T" + utcTime + ":00Z";
        slot.endTime = String.format(Locale.UK, "2026-09-20T%02d%s:00Z",
                Integer.parseInt(utcTime.substring(0, 2)) + 2, utcTime.substring(2));
        slot.capacity = 5;
        slot.availableBays = 2;
        slot.isOpen = true;
        return slot;
    }

    /** A booking at the Malabe station in the given slot. */
    private static ReservationDto booking(String slotId, String utcTime) {
        SlotDto slot = slot(slotId, utcTime);
        ReservationDto booking = new ReservationDto();
        booking.id = "bk-1";
        booking.stationId = "st-mal";
        booking.slotId = slotId;
        booking.startTime = slot.startTime;
        booking.endTime = slot.endTime;
        return booking;
    }

    /** The ids of the slots, in order. */
    private static List<String> ids(List<SlotDto> slots) {
        List<String> ids = new ArrayList<>();
        for (SlotDto slot : slots) {
            ids.add(slot.id);
        }
        return ids;
    }
}
