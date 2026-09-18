/*
 * File:    StationAdapter.java
 * Module:  Stations
 * Owner:   Nimthara
 * Purpose: Draws the stations as a list of cards, nearest first, and says
 *          which one was tapped.
 * Source:  AND-25 (RecyclerView lists).
 */
package lk.sliit.solargrid.ui.map;

import android.annotation.SuppressLint;
import android.view.LayoutInflater;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;
import java.util.List;

import lk.sliit.solargrid.data.remote.dto.StationDto;
import lk.sliit.solargrid.databinding.ItemStationBinding;

public class StationAdapter extends RecyclerView.Adapter<StationAdapter.Row> {

    /** Told which station was tapped. */
    public interface OnStationTap {

        /** Runs when a row is tapped. */
        void onTap(StationDto station);
    }

    private final List<StationDto> stations = new ArrayList<>();
    private final OnStationTap onTap;

    /** Needs to know what to do when a station is tapped. */
    public StationAdapter(OnStationTap onTap) {
        this.onTap = onTap;
    }

    /**
     * Replaces the list. The API sends at most 20 stations as one list, so
     * redrawing every row is simpler than working out which ones changed.
     */
    @SuppressLint("NotifyDataSetChanged")
    public void show(List<StationDto> newStations) {
        stations.clear();
        if (newStations != null) {
            stations.addAll(newStations);
        }
        notifyDataSetChanged();
    }

    /** Builds the card for one row. */
    @NonNull
    @Override
    public Row onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        return new Row(ItemStationBinding.inflate(LayoutInflater.from(parent.getContext()), parent, false));
    }

    /** Fills the card with one station. */
    @Override
    public void onBindViewHolder(@NonNull Row row, int position) {
        StationDto station = stations.get(position);
        row.binding.stationName.setText(station.name);
        row.binding.stationWhere.setText(StationTexts.where(row.binding.getRoot().getContext(), station));
        StationTexts.paintBays(row.binding.stationBays, station);
        row.binding.getRoot().setOnClickListener(view -> onTap.onTap(station));
    }

    /** How many stations are in the list. */
    @Override
    public int getItemCount() {
        return stations.size();
    }

    /** Holds the views of one card. */
    static class Row extends RecyclerView.ViewHolder {

        final ItemStationBinding binding;

        /** Keeps the card views for reuse while scrolling. */
        Row(ItemStationBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }
}
