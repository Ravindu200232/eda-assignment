/*
 * File:    StationsFragment.java
 * Module:  Stations
 * Owner:   Nimthara
 * Purpose: The Map tab. It finds where the prosumer is (when allowed), asks
 *          the API for the stations nearby and puts them on a Google map, or
 *          in a list with a search box. A marker opens a card with the free
 *          bays, the hours of today and the distance. Without a location the
 *          map starts in Colombo, and without a Maps key the list is shown.
 * Source:  AND-29 (Google Maps SDK for Android), AND-28 (fused location),
 *          AND-12 (asking for a permission).
 */
package lk.sliit.solargrid.ui.map;

import android.Manifest;
import android.annotation.SuppressLint;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.google.android.gms.maps.CameraUpdateFactory;
import com.google.android.gms.maps.GoogleMap;
import com.google.android.gms.maps.SupportMapFragment;
import com.google.android.gms.maps.model.BitmapDescriptorFactory;
import com.google.android.gms.maps.model.LatLng;
import com.google.android.gms.maps.model.Marker;
import com.google.android.gms.maps.model.MarkerOptions;

import java.util.ArrayList;
import java.util.List;

import lk.sliit.solargrid.AppContainer;
import lk.sliit.solargrid.BuildConfig;
import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.data.remote.dto.StationDto;
import lk.sliit.solargrid.data.repo.CachedCallback;
import lk.sliit.solargrid.databinding.FragmentStationsBinding;
import lk.sliit.solargrid.ui.common.BaseActivity;
import lk.sliit.solargrid.ui.common.Forms;
import lk.sliit.solargrid.util.LocationFinder;
import lk.sliit.solargrid.util.Places;

public class StationsFragment extends Fragment {

    /** How close the camera starts: about the size of a town. */
    private static final float STARTING_ZOOM = 10.5f;

    private FragmentStationsBinding binding;
    private GoogleMap map;
    private LatLng center = Places.COLOMBO;
    private final List<StationDto> stations = new ArrayList<>();
    private final StationAdapter adapter = new StationAdapter(this::openStation);

    /** Asks for the location once; the answer decides where the map starts. */
    private final ActivityResultLauncher<String[]> locationPermission =
            registerForActivityResult(new ActivityResultContracts.RequestMultiplePermissions(),
                    answers -> findPhone());

    /** Builds the tab, the map (when a key is set) and the list. */
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        binding = FragmentStationsBinding.inflate(inflater, container, false);

        binding.stationsList.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.stationsList.setAdapter(adapter);
        binding.stationsViewToggle.addOnButtonCheckedListener((group, buttonId, checked) -> {
            if (checked) {
                showMapView(buttonId == R.id.stations_show_map);
            }
        });
        binding.stationsSearch.setOnEditorActionListener((view, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_SEARCH) {
                search(Forms.text(binding.stationsSearch));
                return true;
            }
            return false;
        });
        binding.stationCardClose.setOnClickListener(view -> binding.stationCard.setVisibility(View.GONE));

        if (BuildConfig.HAS_MAPS_KEY) {
            addMap();
        } else {
            // Without a key Google shows an empty grey map, so the list is shown instead.
            binding.stationsViewToggle.check(R.id.stations_show_list);
            binding.stationsShowMap.setEnabled(false);
            notice(getString(R.string.stations_no_maps_key));
        }
        return binding.getRoot();
    }

    /** Starts by finding where the phone is. */
    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        if (LocationFinder.isAllowed(requireContext())) {
            findPhone();
        } else {
            locationPermission.launch(new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION});
        }
    }

    /** Puts a Google map into the tab and waits until it is ready. */
    private void addMap() {
        SupportMapFragment mapFragment = (SupportMapFragment) getChildFragmentManager()
                .findFragmentById(R.id.stations_map);
        if (mapFragment == null) {
            mapFragment = SupportMapFragment.newInstance();
            getChildFragmentManager().beginTransaction().replace(R.id.stations_map, mapFragment).commitNow();
        }
        mapFragment.getMapAsync(this::onMapReady);
    }

    /** The map is ready: set it up, draw the stations and move to the starting point. */
    @SuppressLint("MissingPermission") // The blue dot is only switched on after the check.
    private void onMapReady(GoogleMap readyMap) {
        map = readyMap;
        map.getUiSettings().setZoomControlsEnabled(true);
        map.getUiSettings().setMapToolbarEnabled(false);
        if (LocationFinder.isAllowed(requireContext())) {
            map.setMyLocationEnabled(true);
        }
        map.setOnMarkerClickListener(this::onMarkerTap);
        map.setOnMapClickListener(point -> binding.stationCard.setVisibility(View.GONE));
        map.moveCamera(CameraUpdateFactory.newLatLngZoom(center, STARTING_ZOOM));
        drawMarkers();
    }

    /** Asks where the phone is, then loads the stations around that point. */
    private void findPhone() {
        AppContainer.get().location().find(requireContext(), phone -> {
            if (binding == null) {
                return;
            }
            center = Places.startingPoint(phone);
            if (phone == null) {
                notice(getString(R.string.stations_no_location));
            } else if (!Places.isInSriLanka(phone)) {
                notice(getString(R.string.stations_far_away));
            }
            if (map != null) {
                map.moveCamera(CameraUpdateFactory.newLatLngZoom(center, STARTING_ZOOM));
            }
            loadNearby();
        });
    }

    /** Asks the API for the stations around the starting point. */
    private void loadNearby() {
        binding.stationsProgress.setVisibility(View.VISIBLE);
        AppContainer.get().stations().nearby(center.latitude, center.longitude, listCallback());
    }

    /** Asks the API for stations whose name, code or address matches the text. */
    private void search(String text) {
        binding.stationsProgress.setVisibility(View.VISIBLE);
        AppContainer.get().stations().search(text, listCallback());
    }

    /** Shows a list of stations, from the API or from the phone. */
    private CachedCallback<List<StationDto>> listCallback() {
        return new CachedCallback<List<StationDto>>() {

            /** Draws the stations; a list from the phone is marked as possibly old. */
            @Override
            public void onResult(List<StationDto> result, @Nullable ApiError offlineReason) {
                if (binding == null) {
                    return;
                }
                binding.stationsProgress.setVisibility(View.INVISIBLE);
                stations.clear();
                stations.addAll(result);
                adapter.show(stations);
                drawMarkers();
                if (offlineReason != null) {
                    notice(getString(R.string.stations_offline, offlineReason.message));
                } else if (result.isEmpty()) {
                    notice(getString(R.string.stations_none_found));
                }
            }

            /** Nothing to show at all. */
            @Override
            public void onError(ApiError error) {
                if (binding == null) {
                    return;
                }
                binding.stationsProgress.setVisibility(View.INVISIBLE);
                if (requireActivity() instanceof BaseActivity
                        && ((BaseActivity) requireActivity()).handledSessionEnd(error)) {
                    return;
                }
                notice(error.message);
            }
        };
    }

    /** One marker per station: green while bays are free, orange when full. */
    private void drawMarkers() {
        if (map == null) {
            return;
        }
        map.clear();
        for (StationDto station : stations) {
            float colour = station.availableBatterySlots > 0
                    ? BitmapDescriptorFactory.HUE_GREEN
                    : BitmapDescriptorFactory.HUE_ORANGE;
            Marker marker = map.addMarker(new MarkerOptions()
                    .position(new LatLng(station.latitude, station.longitude))
                    .title(station.name)
                    .icon(BitmapDescriptorFactory.defaultMarker(colour)));
            if (marker != null) {
                marker.setTag(station);
            }
        }
    }

    /** A marker was tapped: show the card of its station. */
    private boolean onMarkerTap(Marker marker) {
        Object tag = marker.getTag();
        if (tag instanceof StationDto) {
            showCard((StationDto) tag);
            return true;
        }
        return false;
    }

    /** Fills the card at the bottom of the map. */
    private void showCard(StationDto station) {
        binding.stationCardName.setText(station.name);
        binding.stationCardAddress.setText(StationTexts.where(requireContext(), station));
        binding.stationCardHours.setText(StationTexts.todayHours(requireContext(), station));
        binding.stationCardEnergy.setText(StationTexts.energy(requireContext(), station));
        StationTexts.paintBays(binding.stationCardBays, station);
        binding.stationCardDetails.setOnClickListener(view -> openStation(station));
        binding.stationCard.setVisibility(View.VISIBLE);
    }

    /** Switches between the map and the list. */
    private void showMapView(boolean showMap) {
        binding.stationsMap.setVisibility(showMap ? View.VISIBLE : View.GONE);
        binding.stationsListView.setVisibility(showMap ? View.GONE : View.VISIBLE);
        if (!showMap) {
            binding.stationCard.setVisibility(View.GONE);
        }
    }

    /** Opens the station page with its hours and slots. */
    private void openStation(StationDto station) {
        startActivity(StationDetailsActivity.intentFor(requireContext(), station.id));
    }

    /** Shows a short explanation above the map. */
    private void notice(String message) {
        binding.stationsNotice.setText(message);
        binding.stationsNotice.setVisibility(View.VISIBLE);
    }

    /** Lets go of the views and the map when the tab is closed. */
    @Override
    public void onDestroyView() {
        super.onDestroyView();
        map = null;
        binding = null;
    }
}
