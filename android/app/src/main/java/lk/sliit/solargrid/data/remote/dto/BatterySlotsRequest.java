/*
 * File:    BatterySlotsRequest.java
 * Module:  Stations
 * Owner:   Nimthara
 * Purpose: What a Grid Operator sends to PATCH api/stations/{id}/battery-slots
 *          when the number of working battery bays changes.
 */
package lk.sliit.solargrid.data.remote.dto;

public class BatterySlotsRequest {

    public int availableBatterySlots;

    /** Holds the new number of free bays. */
    public BatterySlotsRequest(int availableBatterySlots) {
        this.availableBatterySlots = availableBatterySlots;
    }
}
