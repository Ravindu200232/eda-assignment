/*
 * File:    BookingSummaryAdapter.java
 * Module:  Dashboards
 * Owner:   Malith
 * Purpose: Draws the coming bookings on the home screen, one card per booking.
 *          The same bind() fills the "next booking" card, so both look alike.
 * Source:  AND-25 (RecyclerView lists).
 */
package lk.sliit.solargrid.ui.prosumer;

import android.annotation.SuppressLint;
import android.content.Context;
import android.view.LayoutInflater;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;
import java.util.List;

import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.remote.dto.BookingSummaryDto;
import lk.sliit.solargrid.databinding.ItemBookingSummaryBinding;
import lk.sliit.solargrid.ui.common.StatusChips;
import lk.sliit.solargrid.util.Texts;
import lk.sliit.solargrid.util.Times;

public class BookingSummaryAdapter extends RecyclerView.Adapter<BookingSummaryAdapter.Row> {

    /** Told which booking was tapped (added by Hamnad: a card opens the booking page). */
    public interface OnBookingTap {

        /** Runs when a card is tapped. */
        void onTap(BookingSummaryDto booking);
    }

    private final List<BookingSummaryDto> bookings = new ArrayList<>();
    @Nullable
    private final OnBookingTap onTap;

    /** Needs to know what to do when a card is tapped, or null for nothing. */
    public BookingSummaryAdapter(@Nullable OnBookingTap onTap) {
        this.onTap = onTap;
    }

    /**
     * Replaces the list with the newest bookings from the API. The dashboard
     * sends at most a handful, always as a whole list, so redrawing all rows
     * is simpler than working out which ones changed.
     */
    @SuppressLint("NotifyDataSetChanged")
    public void show(List<BookingSummaryDto> newBookings) {
        bookings.clear();
        if (newBookings != null) {
            bookings.addAll(newBookings);
        }
        notifyDataSetChanged();
    }

    /** Builds the card for one row. */
    @NonNull
    @Override
    public Row onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        LayoutInflater inflater = LayoutInflater.from(parent.getContext());
        return new Row(ItemBookingSummaryBinding.inflate(inflater, parent, false));
    }

    /** Fills the card with one booking. */
    @Override
    public void onBindViewHolder(@NonNull Row row, int position) {
        BookingSummaryDto booking = bookings.get(position);
        bind(row.binding, booking);
        row.binding.getRoot().setOnClickListener(onTap == null ? null : view -> onTap.onTap(booking));
    }

    /** How many bookings are in the list. */
    @Override
    public int getItemCount() {
        return bookings.size();
    }

    /** Writes a booking into a card; used by the list and the next booking card. */
    public static void bind(ItemBookingSummaryBinding card, BookingSummaryDto booking) {
        Context context = card.getRoot().getContext();
        card.bookingStation.setText(Texts.orDash(booking.stationName));
        card.bookingWhen.setText(Times.slot(booking.startTime, booking.endTime));
        card.bookingDetails.setText(context.getString(R.string.booking_summary_line,
                Texts.orDash(booking.referenceNo), Texts.kwh(booking.energyKwh), trade(context, booking.tradeType)));
        StatusChips.apply(card.bookingStatus, booking.status, false);
    }

    /** "Export" or "Import" as the app writes it. */
    private static String trade(Context context, String tradeType) {
        if ("Export".equals(tradeType)) {
            return context.getString(R.string.trade_export);
        }
        if ("Import".equals(tradeType)) {
            return context.getString(R.string.trade_import);
        }
        return Texts.orDash(tradeType);
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
