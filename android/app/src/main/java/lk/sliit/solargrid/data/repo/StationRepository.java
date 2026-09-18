/*
 * File:    StationRepository.java
 * Module:  Stations
 * Owner:   Nimthara
 * Purpose: Stations, their slots and their battery bays. Every station the
 *          API sends is also saved in SQLite, so when the phone is offline the
 *          map list and the station page still show the last known details.
 *          Slots are never taken from the phone, because a booking must use
 *          the free bays the API knows right now.
 * Source:  AND-21 (background work with an executor).
 */
package lk.sliit.solargrid.data.repo;

import android.os.Handler;
import android.os.Looper;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.Executor;

import lk.sliit.solargrid.data.local.StationDao;
import lk.sliit.solargrid.data.remote.ApiCallback;
import lk.sliit.solargrid.data.remote.ApiCalls;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.data.remote.SolarGridApi;
import lk.sliit.solargrid.data.remote.dto.BatterySlotsRequest;
import lk.sliit.solargrid.data.remote.dto.SlotDto;
import lk.sliit.solargrid.data.remote.dto.StationDto;
import lk.sliit.solargrid.util.Times;

public class StationRepository {

    /** How far the map looks for stations; Sri Lanka fits inside it. */
    public static final double SEARCH_RADIUS_KM = 300;

    private final SolarGridApi api;
    private final StationDao stations;
    private final Executor worker;
    private final Handler mainThread = new Handler(Looper.getMainLooper());

    /** Needs the API, the station table and the database thread. */
    public StationRepository(SolarGridApi api, StationDao stations, Executor worker) {
        this.api = api;
        this.stations = stations;
        this.worker = worker;
    }

    /** The stations around a point, nearest first (at most 20, as the API decides). */
    public void nearby(double latitude, double longitude, CachedCallback<List<StationDto>> callback) {
        // The API reads numbers with a full stop, whatever language the phone uses.
        String lat = String.format(Locale.US, "%.6f", latitude);
        String lng = String.format(Locale.US, "%.6f", longitude);
        String radius = String.format(Locale.US, "%.0f", SEARCH_RADIUS_KM);
        ApiCalls.enqueue(api.nearbyStations(lat, lng, radius), keepList(callback));
    }

    /** Stations whose name, code or address contains the text. */
    public void search(String text, CachedCallback<List<StationDto>> callback) {
        ApiCalls.enqueue(api.stations(text == null || text.trim().isEmpty() ? null : text.trim()), keepList(callback));
    }

    /** One station, from the API or, when offline, from the phone. */
    public void station(String id, CachedCallback<StationDto> callback) {
        ApiCalls.enqueue(api.station(id), new ApiCallback<StationDto>() {

            /** Keeps the newest copy and shows it. */
            @Override
            public void onSuccess(StationDto station) {
                if (station != null) {
                    worker.execute(() -> stations.saveAll(List.of(station)));
                }
                callback.onResult(station, null);
            }

            /** Offline: the saved copy, if there is one. */
            @Override
            public void onError(ApiError error) {
                if (!error.isOffline()) {
                    callback.onError(error);
                    return;
                }
                worker.execute(() -> {
                    StationDto saved = stations.find(id);
                    mainThread.post(() -> {
                        if (saved == null) {
                            callback.onError(error);
                        } else {
                            callback.onResult(saved, error);
                        }
                    });
                });
            }
        });
    }

    /** The slots of one Sri Lankan day at a station, straight from the API. */
    public void slots(String stationId, LocalDate day, ApiCallback<List<SlotDto>> callback) {
        String date = Times.isoDay(day);
        ApiCalls.enqueue(api.stationSlots(stationId, date, date), callback);
    }

    /** Sets how many battery bays are free now, and keeps the answer. */
    public void updateBays(String stationId, int freeBays, ApiCallback<StationDto> callback) {
        ApiCalls.enqueue(api.updateBatterySlots(stationId, new BatterySlotsRequest(freeBays)),
                new ApiCallback<StationDto>() {

                    /** The API accepted the number. */
                    @Override
                    public void onSuccess(StationDto station) {
                        if (station != null) {
                            worker.execute(() -> stations.saveAll(List.of(station)));
                        }
                        callback.onSuccess(station);
                    }

                    /** The number was refused, or the server is not there. */
                    @Override
                    public void onError(ApiError error) {
                        callback.onError(error);
                    }
                });
    }

    /** Saves a list that came from the API, or falls back to the saved one offline. */
    private ApiCallback<List<StationDto>> keepList(CachedCallback<List<StationDto>> callback) {
        return new ApiCallback<List<StationDto>>() {

            /** Keeps the stations and shows them. */
            @Override
            public void onSuccess(List<StationDto> list) {
                List<StationDto> result = list == null ? List.of() : list;
                worker.execute(() -> stations.saveAll(result));
                callback.onResult(result, null);
            }

            /** Offline: every station saved on the phone, if there are any. */
            @Override
            public void onError(ApiError error) {
                if (!error.isOffline()) {
                    callback.onError(error);
                    return;
                }
                worker.execute(() -> {
                    List<StationDto> saved = stations.findAll();
                    mainThread.post(() -> {
                        if (saved.isEmpty()) {
                            callback.onError(error);
                        } else {
                            callback.onResult(saved, error);
                        }
                    });
                });
            }
        };
    }
}
