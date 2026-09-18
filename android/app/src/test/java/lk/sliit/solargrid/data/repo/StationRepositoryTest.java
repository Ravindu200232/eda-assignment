/*
 * File:    StationRepositoryTest.java
 * Module:  Tests
 * Owner:   Nimthara
 * Purpose: Checks the station calls against a stand-in server: the nearby
 *          search sends plain numbers, the stations are saved for offline use
 *          and come back when the server is gone, the slots ask for one day,
 *          and a bay change is sent with PATCH.
 * Source:  AND-13 (Robolectric), AND-14 (MockWebServer).
 */
package lk.sliit.solargrid.data.repo;

import static org.junit.Assert.assertEquals;
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
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicReference;

import lk.sliit.solargrid.AppContainer;
import lk.sliit.solargrid.data.local.StationDao;
import lk.sliit.solargrid.data.remote.ApiCallback;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.data.remote.dto.SlotDto;
import lk.sliit.solargrid.data.remote.dto.StationDto;
import lk.sliit.solargrid.testing.FakeApi;
import lk.sliit.solargrid.testing.Samples;
import lk.sliit.solargrid.testing.TestWait;
import okhttp3.mockwebserver.RecordedRequest;

@RunWith(RobolectricTestRunner.class)
public class StationRepositoryTest {

    private final FakeApi api = new FakeApi();
    private final AtomicReference<List<StationDto>> list = new AtomicReference<>();
    private final AtomicReference<ApiError> offline = new AtomicReference<>();
    private final AtomicReference<ApiError> failure = new AtomicReference<>();
    private final Locale originalLocale = Locale.getDefault();

    /** Starts the stand-in server. */
    @Before
    public void setUp() throws IOException {
        api.start();
    }

    /** Stops the stand-in server and puts the language back. */
    @After
    public void tearDown() throws IOException {
        api.stop();
        Locale.setDefault(originalLocale);
    }

    /** The nearby search sends plain numbers, even on a phone set to a language that writes 6,9. */
    @Test
    public void sendsPlainNumbersToTheNearbySearch() throws InterruptedException {
        Locale.setDefault(Locale.GERMANY);
        api.willAnswer(200, Samples.nearbyStations());

        nearby();

        RecordedRequest sent = api.requestSent();
        assertTrue(sent.getPath(), sent.getPath().startsWith("/api/stations/nearby?lat=6.914700&lng=79.972900"));
        assertEquals(3, list.get().size());
        assertNull(offline.get());
    }

    /** Without the server, the stations saved last time are shown with the reason. */
    @Test
    public void showsSavedStationsWhenOffline() throws IOException {
        api.willAnswer(200, Samples.nearbyStations());
        nearby();
        TestWait.until(() -> saved().size() == 3);

        api.stop();
        list.set(null);
        nearby();

        assertEquals(3, list.get().size());
        assertNotNull(offline.get());
        assertEquals("SLIIT Malabe Campus Microgrid", list.get().get(0).name);
    }

    /** The slots ask the API for exactly one Sri Lankan day. */
    @Test
    public void asksForTheSlotsOfOneDay() throws InterruptedException {
        api.willAnswer(200, Samples.slotsToday());
        AtomicReference<List<SlotDto>> slots = new AtomicReference<>();

        AppContainer.get().stations().slots("st-mal", LocalDate.of(2026, 9, 18), new ApiCallback<List<SlotDto>>() {

            /** The slots arrived. */
            @Override
            public void onSuccess(List<SlotDto> result) {
                slots.set(result);
            }

            /** Not expected here. */
            @Override
            public void onError(ApiError error) {
                failure.set(error);
            }
        });

        TestWait.until(() -> slots.get() != null || failure.get() != null);
        assertEquals(3, slots.get().size());
        assertEquals("/api/stations/st-mal/slots?from=2026-09-18&to=2026-09-18", api.requestSent().getPath());
    }

    /** A bay change is sent with PATCH and the new number. */
    @Test
    public void sendsTheFreeBays() throws InterruptedException {
        api.willAnswer(200, Samples.malabeStation(8));
        AtomicReference<StationDto> updated = new AtomicReference<>();

        AppContainer.get().stations().updateBays("st-mal", 8, new ApiCallback<StationDto>() {

            /** The API kept the number. */
            @Override
            public void onSuccess(StationDto result) {
                updated.set(result);
            }

            /** Not expected here. */
            @Override
            public void onError(ApiError error) {
                failure.set(error);
            }
        });

        TestWait.until(() -> updated.get() != null || failure.get() != null);
        assertEquals(8, updated.get().availableBatterySlots);
        RecordedRequest sent = api.requestSent();
        assertEquals("PATCH", sent.getMethod());
        assertEquals("/api/stations/st-mal/battery-slots", sent.getPath());
        assertTrue(sent.getBody().readUtf8().contains("\"availableBatterySlots\":8"));
    }

    /** Runs the nearby search around Malabe and waits for the answer. */
    private void nearby() {
        list.set(null);
        offline.set(null);
        failure.set(null);
        AppContainer.get().stations().nearby(6.9147, 79.9729, new CachedCallback<List<StationDto>>() {

            /** The stations arrived, from the API or the phone. */
            @Override
            public void onResult(List<StationDto> value, ApiError offlineReason) {
                list.set(value);
                offline.set(offlineReason);
            }

            /** Nothing could be shown. */
            @Override
            public void onError(ApiError error) {
                failure.set(error);
            }
        });
        TestWait.until(() -> list.get() != null || failure.get() != null);
    }

    /** The stations saved on the phone. */
    private static List<StationDto> saved() {
        return new StationDao(AppContainer.get().database()).findAll();
    }
}
