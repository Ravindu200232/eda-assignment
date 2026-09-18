/*
 * File:    ReservationRepository.java
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: Everything about bookings: the lists, one booking, making,
 *          changing and cancelling, and the QR code. The API applies every
 *          rule (7-day window, 12-hour notice, free bays, energy limit) and
 *          says so in its messages. The last bookings seen are kept in SQLite
 *          so the lists still show offline, but a copy on the phone never
 *          allows a change.
 * Source:  AND-21 (background work with an executor).
 */
package lk.sliit.solargrid.data.repo;

import android.os.Handler;
import android.os.Looper;

import androidx.annotation.Nullable;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.Executor;

import lk.sliit.solargrid.data.local.ReservationDao;
import lk.sliit.solargrid.data.model.BookingFilter;
import lk.sliit.solargrid.data.remote.ApiCallback;
import lk.sliit.solargrid.data.remote.ApiCalls;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.data.remote.SolarGridApi;
import lk.sliit.solargrid.data.remote.dto.BookingRequests;
import lk.sliit.solargrid.data.remote.dto.QrCodeDto;
import lk.sliit.solargrid.data.remote.dto.ReservationDto;
import lk.sliit.solargrid.data.remote.dto.ReservationPageDto;
import lk.sliit.solargrid.util.Times;

public class ReservationRepository {

    /** How many bookings one page of the list holds. */
    public static final int PAGE_SIZE = 20;

    /** Enough for every booking of one day at all stations (operators). */
    public static final int DAY_PAGE_SIZE = 100;

    private final SolarGridApi api;
    private final ReservationDao bookings;
    private final Executor worker;
    private final Handler mainThread = new Handler(Looper.getMainLooper());

    /** Needs the API, the booking table and the database thread. */
    public ReservationRepository(SolarGridApi api, ReservationDao bookings, Executor worker) {
        this.api = api;
        this.bookings = bookings;
        this.worker = worker;
    }

    /** One page of the list; offline, the saved bookings of the same tab. */
    public void list(BookingFilter filter, int page, CachedCallback<ReservationPageDto> callback) {
        ApiCalls.enqueue(api.reservations(filter.scope, filter.status, filter.stationId, filter.fromText(),
                filter.toText(), filter.searchText(), page, PAGE_SIZE), new ApiCallback<ReservationPageDto>() {

            /** Keeps the bookings and shows the page. */
            @Override
            public void onSuccess(ReservationPageDto result) {
                ReservationPageDto safe = result == null ? new ReservationPageDto() : result;
                keep(safe.items);
                callback.onResult(safe, null);
            }

            /** Offline: the saved bookings that belong to this tab. */
            @Override
            public void onError(ApiError error) {
                if (!error.isOffline()) {
                    callback.onError(error);
                    return;
                }
                worker.execute(() -> {
                    ReservationPageDto saved = savedPage(filter);
                    mainThread.post(() -> {
                        if (saved.items.isEmpty()) {
                            callback.onError(error);
                        } else {
                            callback.onResult(saved, error);
                        }
                    });
                });
            }
        });
    }

    /**
     * The bookings of one day at every station, for the operator "Today" tab.
     * The search text matches the reference, station, prosumer name or NIC.
     */
    public void forDay(LocalDate day, @Nullable String search, ApiCallback<ReservationPageDto> callback) {
        String date = Times.isoDay(day);
        String text = search == null || search.trim().isEmpty() ? null : search.trim();
        ApiCalls.enqueue(api.reservations(null, null, null, date, date, text, 1, DAY_PAGE_SIZE), callback);
    }

    /** One booking; offline, the saved copy (which never allows a change). */
    public void get(String id, CachedCallback<ReservationDto> callback) {
        ApiCalls.enqueue(api.reservation(id), new ApiCallback<ReservationDto>() {

            /** Keeps the newest copy and shows it. */
            @Override
            public void onSuccess(ReservationDto booking) {
                if (booking != null) {
                    keep(List.of(booking));
                }
                callback.onResult(booking, null);
            }

            /** Offline: the saved copy, if there is one. */
            @Override
            public void onError(ApiError error) {
                if (!error.isOffline()) {
                    callback.onError(error);
                    return;
                }
                worker.execute(() -> {
                    ReservationDto saved = bookings.find(id);
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

    /** Books a slot; the new booking waits for approval. */
    public void create(BookingRequests.Booking request, ApiCallback<ReservationDto> callback) {
        ApiCalls.enqueue(api.createReservation(request), keepOne(callback));
    }

    /** Changes a booking; the API checks the 12-hour notice. */
    public void update(String id, BookingRequests.Booking request, ApiCallback<ReservationDto> callback) {
        ApiCalls.enqueue(api.updateReservation(id, request), keepOne(callback));
    }

    /** Cancels a booking, with an optional reason. */
    public void cancel(String id, @Nullable String reason, ApiCallback<ReservationDto> callback) {
        String cleaned = reason == null || reason.trim().isEmpty() ? null : reason.trim();
        ApiCalls.enqueue(api.cancelReservation(id, new BookingRequests.Cancel(cleaned)), keepOne(callback));
    }

    /** The signed text of the QR code of an approved booking. */
    public void qrCode(String id, ApiCallback<QrCodeDto> callback) {
        ApiCalls.enqueue(api.reservationQr(id), callback);
    }

    /** Saves the newest copy of a booking that came back from a change. */
    private ApiCallback<ReservationDto> keepOne(ApiCallback<ReservationDto> callback) {
        return new ApiCallback<ReservationDto>() {

            /** Keeps the booking and passes it on. */
            @Override
            public void onSuccess(ReservationDto booking) {
                if (booking != null) {
                    keep(List.of(booking));
                }
                callback.onSuccess(booking);
            }

            /** Passes the problem on unchanged. */
            @Override
            public void onError(ApiError error) {
                callback.onError(error);
            }
        };
    }

    /** Saves bookings in the background. */
    private void keep(List<ReservationDto> list) {
        if (list != null && !list.isEmpty()) {
            List<ReservationDto> copy = new ArrayList<>(list);
            worker.execute(() -> bookings.saveAll(copy));
        }
    }

    /**
     * Builds one page from the saved bookings. Only used offline, to show the
     * copies in the tab they were last seen in; the API is the judge online.
     */
    private ReservationPageDto savedPage(BookingFilter filter) {
        String search = filter.searchText() == null ? null : filter.searchText().toLowerCase(Locale.ROOT);
        ReservationPageDto page = new ReservationPageDto();
        for (ReservationDto booking : bookings.findAll()) {
            if (!inTab(booking, filter.scope)) {
                continue;
            }
            if (search != null && !matches(booking, search)) {
                continue;
            }
            page.items.add(booking);
        }
        page.total = page.items.size();
        page.page = 1;
        page.pageSize = page.items.size();
        page.totalPages = 1;
        return page;
    }

    /** Which tab a saved booking was shown in. */
    private static boolean inTab(ReservationDto booking, String scope) {
        boolean pending = "Pending".equals(booking.status) && !booking.isPast;
        boolean current = "Approved".equals(booking.status) && !booking.isPast;
        if (BookingFilter.PENDING.equals(scope)) {
            return pending;
        }
        if (BookingFilter.CURRENT.equals(scope)) {
            return current;
        }
        return !pending && !current;
    }

    /** True when the reference or the station name contains the search text. */
    private static boolean matches(ReservationDto booking, String search) {
        return (booking.referenceNo != null && booking.referenceNo.toLowerCase(Locale.ROOT).contains(search))
                || (booking.stationName != null && booking.stationName.toLowerCase(Locale.ROOT).contains(search));
    }
}
