/*
 * File:    ReservationDto.java
 * Module:  API access
 * Owner:   Ravindu (shared: the booking screens use the same shape)
 * Purpose: One energy booking as the Web API sends it, including the flags the
 *          API works out for us: can it still be changed, has it a QR code and
 *          is its time already over.
 */
package lk.sliit.solargrid.data.remote.dto;

public class ReservationDto {

    public String id;
    public String referenceNo;

    public String prosumerNic;
    public String prosumerName;

    public String stationId;
    public String stationName;
    public String slotId;

    /** Start and end of the booked slot (UTC). */
    public String startTime;
    public String endTime;

    /** "Export" (selling to the grid) or "Import" (charging from the grid). */
    public String tradeType;

    public double energyKwh;

    /** Filled in by the operator when the transfer is finished. */
    public Double deliveredKwh;

    /** "Pending", "Approved", "Rejected", "Cancelled" or "Completed". */
    public String status;

    /** Why it was cancelled or rejected. */
    public String reason;

    public String createdBy;
    public String createdAt;
    public String updatedAt;

    public String approvedBy;
    public String approvedAt;
    public String rejectedBy;
    public String rejectedAt;
    public String cancelledBy;
    public String cancelledAt;
    public String completedBy;
    public String completedAt;

    /** True while the 12-hour rule still allows a change or a cancel. */
    public boolean canModify;

    /** The last moment for changes: 12 hours before the start. */
    public String modifyDeadline;

    /** True when an approved booking has a QR code to show. */
    public boolean hasQrCode;

    /** True when the slot has already ended. */
    public boolean isPast;
}
