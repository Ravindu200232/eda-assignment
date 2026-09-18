/*
 * File:    ReservationRepositoryTest.java
 * Module:  Tests
 * Owner:   Hamnad
 * Purpose: Checks the booking calls against a stand-in server: the list sends
 *          the tab and the filters, offline the saved bookings of the same tab
 *          are shown, a booking and a change send the right body and method,
 *          a cancel sends its reason as JSON, the operator day list asks for
 *          one day, and the API's refusals reach the screen unchanged.
 * Source:  AND-13 (Robolectric), AND-14 (MockWebServer).
 */
package lk.sliit.solargrid.data.repo;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;

import java.io.IOException;
import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicReference;

import lk.sliit.solargrid.AppContainer;
import lk.sliit.solargrid.data.local.ReservationDao;
import lk.sliit.solargrid.data.model.BookingFilter;
import lk.sliit.solargrid.data.remote.ApiCallback;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.data.remote.dto.BookingRequests;
import lk.sliit.solargrid.data.remote.dto.QrCodeDto;
import lk.sliit.solargrid.data.remote.dto.ReservationDto;
import lk.sliit.solargrid.data.remote.dto.ReservationPageDto;
import lk.sliit.solargrid.testing.FakeApi;
import lk.sliit.solargrid.testing.Samples;
import lk.sliit.solargrid.testing.TestWait;
import okhttp3.mockwebserver.RecordedRequest;

@RunWith(RobolectricTestRunner.class)
public class ReservationRepositoryTest {

    private final FakeApi api = new FakeApi();
    private final AtomicReference<ReservationPageDto> page = new AtomicReference<>();
    private final AtomicReference<ReservationDto> booking = new AtomicReference<>();
    private final AtomicReference<ApiError> offline = new AtomicReference<>();
    private final AtomicReference<ApiError> failure = new AtomicReference<>();

    /** Starts the stand-in server with no bookings saved on the phone. */
    @Before
    public void setUp() throws IOException {
        AppContainer.get().database().clearPersonalData();
        api.start();
    }

    /** Stops the stand-in server. */
    @After
    public void tearDown() throws IOException {
        api.stop();
    }

    /** The list sends the tab, every filter that is set, and the page. */
    @Test
    public void sendsTheTabAndTheFilters() throws InterruptedException {
        api.willAnswer(200, Samples.bookingPage(0, 2, 1));
        BookingFilter filter = new BookingFilter();
        filter.scope = BookingFilter.PENDING;
        filter.stationId = "st-mal";
        filter.from = LocalDate.of(2026, 9, 20);
        filter.to = LocalDate.of(2026, 9, 22);
        filter.search = "  RSV-2609  ";

        list(filter, 2);

        assertEquals("/api/reservations?scope=Pending&stationId=st-mal&from=2026-09-20&to=2026-09-22"
                + "&search=RSV-2609&page=2&pageSize=20", api.requestSent().getPath());
        assertNull(offline.get());
    }

    /** A full first page says that more bookings follow. */
    @Test
    public void knowsWhenMorePagesFollow() {
        api.willAnswer(200, Samples.bookingPage(25, 1, 2, Samples.booking("Approved", 30)));

        list(new BookingFilter(), 1);

        assertEquals(1, page.get().items.size());
        assertTrue(page.get().hasMore());
    }

    /** Offline, the saved bookings that belong to the same tab are shown with the reason. */
    @Test
    public void showsTheSavedBookingsOfTheTabWhenOffline() throws IOException {
        api.willAnswer(200, Samples.bookingPage(3, 1, 1,
                Samples.booking("bk-a", "RSV-A", "Approved", 30),
                Samples.booking("bk-p", "RSV-P", "Pending", 40),
                Samples.booking("bk-c", "RSV-C", "Cancelled", 50)));
        list(new BookingFilter(), 1);
        TestWait.until(() -> saved().findAll().size() == 3);

        api.stop();
        BookingFilter waiting = new BookingFilter();
        waiting.scope = BookingFilter.PENDING;
        list(waiting, 1);

        assertNotNull(offline.get());
        assertEquals(1, page.get().items.size());
        assertEquals("RSV-P", page.get().items.get(0).referenceNo);
        assertFalse(page.get().hasMore());
    }

    /** Offline, a search that matches nothing saved reports the connection problem. */
    @Test
    public void reportsTheProblemWhenNothingSavedMatches() throws IOException {
        api.stop();

        list(new BookingFilter(), 1);

        assertNull(page.get());
        assertTrue(failure.get().isOffline());
    }

    /** A new booking is sent with its slot, energy and direction, and kept on the phone. */
    @Test
    public void sendsANewBooking() throws InterruptedException {
        api.willAnswer(201, Samples.booking("Pending", 30));

        AppContainer.get().reservations().create(
                new BookingRequests.Booking("sl-2", 12.5, BookingRequests.EXPORT), keepBooking());
        TestWait.until(() -> booking.get() != null || failure.get() != null);

        RecordedRequest sent = api.requestSent();
        assertEquals("POST", sent.getMethod());
        assertEquals("/api/reservations", sent.getPath());
        String body = sent.getBody().readUtf8();
        assertTrue(body, body.contains("\"slotId\":\"sl-2\""));
        assertTrue(body, body.contains("\"energyKwh\":12.5"));
        assertTrue(body, body.contains("\"tradeType\":\"Export\""));
        assertEquals("Pending", booking.get().status);
        TestWait.until(() -> saved().find(Samples.BOOKING_ID) != null);
    }

    /** A change is sent with PUT to the booking's own address. */
    @Test
    public void sendsAChangeWithPut() throws InterruptedException {
        api.willAnswer(200, Samples.booking("Pending", 30));

        AppContainer.get().reservations().update(Samples.BOOKING_ID,
                new BookingRequests.Booking("sl-1", 20.0, BookingRequests.IMPORT), keepBooking());
        TestWait.until(() -> booking.get() != null || failure.get() != null);

        RecordedRequest sent = api.requestSent();
        assertEquals("PUT", sent.getMethod());
        assertEquals("/api/reservations/" + Samples.BOOKING_ID, sent.getPath());
        assertTrue(sent.getBody().readUtf8().contains("\"tradeType\":\"Import\""));
    }

    /** A cancel sends the trimmed reason as JSON. */
    @Test
    public void sendsTheCancelReasonAsJson() throws InterruptedException {
        api.willAnswer(200, Samples.booking("Cancelled", 30));

        AppContainer.get().reservations().cancel(Samples.BOOKING_ID, "  Plans changed  ", keepBooking());
        TestWait.until(() -> booking.get() != null || failure.get() != null);

        RecordedRequest sent = api.requestSent();
        assertEquals("POST", sent.getMethod());
        assertEquals("/api/reservations/" + Samples.BOOKING_ID + "/cancel", sent.getPath());
        assertTrue(sent.getHeader("Content-Type").startsWith("application/json"));
        assertEquals("{\"reason\":\"Plans changed\"}", sent.getBody().readUtf8());
        assertEquals("Cancelled", booking.get().status);
    }

    /** An empty reason is left out instead of being sent as spaces. */
    @Test
    public void leavesOutAnEmptyReason() throws InterruptedException {
        api.willAnswer(200, Samples.booking("Cancelled", 30));

        AppContainer.get().reservations().cancel(Samples.BOOKING_ID, "   ", keepBooking());
        TestWait.until(() -> booking.get() != null || failure.get() != null);

        assertEquals("{}", api.requestSent().getBody().readUtf8());
    }

    /** The 12-hour refusal reaches the screen with the API's own words. */
    @Test
    public void passesOnTheRefusalOfTheApi() {
        api.willFail(400, Samples.problem("Business rule violated", 400,
                "Bookings can only be cancelled at least 12 hours before the start time."));

        AppContainer.get().reservations().cancel(Samples.BOOKING_ID, null, keepBooking());
        TestWait.until(() -> booking.get() != null || failure.get() != null);

        assertNull(booking.get());
        assertEquals(400, failure.get().status);
        assertEquals("Bookings can only be cancelled at least 12 hours before the start time.",
                failure.get().message);
    }

    /** Offline, one booking comes from the phone and cannot be changed. */
    @Test
    public void showsTheSavedCopyOfOneBookingWhenOffline() throws IOException {
        api.willAnswer(200, Samples.booking("Approved", 30));
        get();
        assertTrue(booking.get().canModify);
        TestWait.until(() -> saved().find(Samples.BOOKING_ID) != null);

        api.stop();
        get();

        assertNotNull(offline.get());
        assertEquals("RSV-260918-HURV8", booking.get().referenceNo);
        assertFalse(booking.get().canModify);
    }

    /** The operator list asks for one day at every station, with the search text trimmed. */
    @Test
    public void asksForOneDayForTheOperator() throws InterruptedException {
        api.willAnswer(200, Samples.bookingPage(0, 1, 0));
        AtomicReference<ReservationPageDto> day = new AtomicReference<>();

        AppContainer.get().reservations().forDay(LocalDate.of(2026, 9, 20), "  kasun ",
                new ApiCallback<ReservationPageDto>() {

                    /** The day arrived. */
                    @Override
                    public void onSuccess(ReservationPageDto result) {
                        day.set(result);
                    }

                    /** Not expected here. */
                    @Override
                    public void onError(ApiError error) {
                        failure.set(error);
                    }
                });
        TestWait.until(() -> day.get() != null || failure.get() != null);

        assertEquals("/api/reservations?from=2026-09-20&to=2026-09-20&search=kasun&page=1&pageSize=100",
                api.requestSent().getPath());
    }

    /** The QR text comes back exactly as the API signed it. */
    @Test
    public void readsTheSignedQrText() throws InterruptedException {
        api.willAnswer(200, Samples.qrCode());
        AtomicReference<QrCodeDto> qr = new AtomicReference<>();

        AppContainer.get().reservations().qrCode(Samples.BOOKING_ID, new ApiCallback<QrCodeDto>() {

            /** The code arrived. */
            @Override
            public void onSuccess(QrCodeDto result) {
                qr.set(result);
            }

            /** Not expected here. */
            @Override
            public void onError(ApiError error) {
                failure.set(error);
            }
        });
        TestWait.until(() -> qr.get() != null || failure.get() != null);

        assertEquals(Samples.QR_PAYLOAD, qr.get().payload);
        assertEquals("/api/reservations/" + Samples.BOOKING_ID + "/qr", api.requestSent().getPath());
    }

    /** Loads one page of the list and waits for the answer. */
    private void list(BookingFilter filter, int pageNumber) {
        page.set(null);
        offline.set(null);
        failure.set(null);
        AppContainer.get().reservations().list(filter, pageNumber, new CachedCallback<ReservationPageDto>() {

            /** The page arrived, from the API or the phone. */
            @Override
            public void onResult(ReservationPageDto value, ApiError offlineReason) {
                page.set(value);
                offline.set(offlineReason);
            }

            /** Nothing could be shown. */
            @Override
            public void onError(ApiError error) {
                failure.set(error);
            }
        });
        TestWait.until(() -> page.get() != null || failure.get() != null);
    }

    /** Loads the sample booking and waits for the answer. */
    private void get() {
        booking.set(null);
        offline.set(null);
        failure.set(null);
        AppContainer.get().reservations().get(Samples.BOOKING_ID, new CachedCallback<ReservationDto>() {

            /** The booking arrived, from the API or the phone. */
            @Override
            public void onResult(ReservationDto value, ApiError offlineReason) {
                booking.set(value);
                offline.set(offlineReason);
            }

            /** Nothing could be shown. */
            @Override
            public void onError(ApiError error) {
                failure.set(error);
            }
        });
        TestWait.until(() -> booking.get() != null || failure.get() != null);
    }

    /** Keeps the answer of a create, change or cancel. */
    private ApiCallback<ReservationDto> keepBooking() {
        return new ApiCallback<ReservationDto>() {

            /** The API saved the booking. */
            @Override
            public void onSuccess(ReservationDto result) {
                booking.set(result);
            }

            /** The API said no. */
            @Override
            public void onError(ApiError error) {
                failure.set(error);
            }
        };
    }

    /** The bookings saved on the phone. */
    private static ReservationDao saved() {
        return new ReservationDao(AppContainer.get().database());
    }
}
