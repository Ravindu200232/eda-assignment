/*
 * File:    ReservationAdapter.java
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: Draws bookings as cards in the Bookings tab and in the operator
 *          "Today" list, with the same card the home screen uses. Operators
 *          also see whose booking it is.
 * Source:  AND-25 (RecyclerView lists).
 */
package lk.sliit.solargrid.ui.booking;

import android.annotation.SuppressLint;
import android.content.Context;
import android.view.LayoutInflater;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;
import java.util.List;

import lk.sliit.solargrid.data.remote.dto.ReservationDto;
import lk.sliit.solargrid.databinding.ItemBookingSummaryBinding;
import lk.sliit.solargrid.ui.common.StatusChips;
import lk.sliit.solargrid.util.Texts;
import lk.sliit.solargrid.util.Times;

public class ReservationAdapter extends RecyclerView.Adapter<ReservationAdapter.Row> {

    /** Told which booking was tapped. */
    public interface OnBookingTap {

        /** Runs when a card is tapped. */
        void onTap(ReservationDto booking);
    }

    private final List<ReservationDto> bookings = new ArrayList<>();
    private final OnBookingTap onTap;
    private final boolean showProsumer;

    /** Needs to know what to do on a tap, and whether to name the prosumer. */
    public ReservationAdapter(OnBookingTap onTap, boolean showProsumer) {
        this.onTap = onTap;
        this.showProsumer = showProsumer;
    }

    /**
     * Replaces the list with a new first page. A page is at most 20 bookings,
     * so redrawing every row is simpler than working out which ones changed.
     */
    @SuppressLint("NotifyDataSetChanged")
    public void show(List<ReservationDto> firstPage) {
        bookings.clear();
        bookings.addAll(firstPage);
        notifyDataSetChanged();
    }

    /** Adds the next page at the end of the list. */
    public void append(List<ReservationDto> nextPage) {
        int start = bookings.size();
        bookings.addAll(nextPage);
        notifyItemRangeInserted(start, nextPage.size());
    }

    /** Builds the card for one row. */
    @NonNull
    @Override
    public Row onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        return new Row(ItemBookingSummaryBinding.inflate(LayoutInflater.from(parent.getContext()), parent, false));
    }

    /** Fills the card with one booking. */
    @Override
    public void onBindViewHolder(@NonNull Row row, int position) {
        ReservationDto booking = bookings.get(position);
        Context context = row.binding.getRoot().getContext();
        row.binding.bookingStation.setText(Texts.orDash(booking.stationName));
        row.binding.bookingWhen.setText(Times.slot(booking.startTime, booking.endTime));
        row.binding.bookingDetails.setText(BookingTexts.shortLine(context, booking, showProsumer));
        StatusChips.apply(row.binding.bookingStatus, booking.status, booking.isPast);
        row.binding.getRoot().setOnClickListener(view -> onTap.onTap(booking));
    }

    /** How many bookings are in the list. */
    @Override
    public int getItemCount() {
        return bookings.size();
    }

    /** Holds the views of one card. */
    static class Row extends RecyclerView.ViewHolder {

        final ItemBookingSummaryBinding binding;

        /** Keeps the card views for reuse while scrolling. */
        Row(ItemBookingSummaryBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }
}
