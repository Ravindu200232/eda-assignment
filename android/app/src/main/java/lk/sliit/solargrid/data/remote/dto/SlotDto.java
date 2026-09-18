/*
 * File:    SlotDto.java
 * Module:  Stations
 * Owner:   Nimthara
 * Purpose: One time slot at a station, as GET api/stations/{id}/slots sends
 *          it: when it runs, how many bays it has and how many are still free.
 */
package lk.sliit.solargrid.data.remote.dto;

public class SlotDto {

    public String id;
    public String stationId;

    /** Start and end of the slot (UTC). */
    public String startTime;
    public String endTime;

    /** Bays in this slot, and how many bookings already use them. */
    public int capacity;
    public int bookedCount;
    public int availableBays;

    /** False when the station closed the slot. */
    public boolean isOpen;
}
