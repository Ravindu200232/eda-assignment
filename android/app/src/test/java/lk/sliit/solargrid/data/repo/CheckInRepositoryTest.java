/*
 * File:    CheckInRepositoryTest.java
 * Module:  Tests
 * Owner:   Ravindu
 * Purpose: Checks the two operator calls against a stand-in server: a scanned
 *          code is sent as it was read, the booking comes back in full, a code
 *          the API refuses keeps its message, and finishing a transfer records
 *          the delivered energy.
 * Source:  AND-13 (Robolectric), AND-14 (MockWebServer).
 */
package lk.sliit.solargrid.data.repo;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;

import java.io.IOException;
import java.util.concurrent.atomic.AtomicReference;

import lk.sliit.solargrid.AppContainer;
import lk.sliit.solargrid.data.remote.ApiCallback;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.data.remote.dto.CheckInResponse;
import lk.sliit.solargrid.data.remote.dto.ReservationDto;
import lk.sliit.solargrid.testing.FakeApi;
import lk.sliit.solargrid.testing.Samples;
import lk.sliit.solargrid.testing.TestWait;
import okhttp3.mockwebserver.RecordedRequest;

@RunWith(RobolectricTestRunner.class)
public class CheckInRepositoryTest {

    private static final String PAYLOAD = "SSG1.66eb1f2c9a2b4c0012ab34cd.7f3a91.2b8c4d6e";

    private final FakeApi api = new FakeApi();
    private final AtomicReference<CheckInResponse> checked = new AtomicReference<>();
    private final AtomicReference<ReservationDto> completed = new AtomicReference<>();
    private final AtomicReference<ApiError> failure = new AtomicReference<>();

    /** Starts the stand-in server and points the app at it. */
    @Before
    public void setUp() throws IOException {
        api.start();
    }

    /** Stops the stand-in server. */
    @After
    public void tearDown() throws IOException {
        api.stop();
    }

    /** A good code brings back the booking and the check-in window. */
    @Test
    public void readsTheBookingBehindTheCode() {
        api.willAnswer(200, Samples.checkIn(true, "The booking is approved for this station."));

        verify();

        TestWait.until(() -> checked.get() != null || failure.get() != null);
        CheckInResponse answer = checked.get();
        assertNotNull("The check did not finish: " + failure.get(), answer);
        assertTrue(answer.canComplete);
        assertEquals("The booking is approved for this station.", answer.message);
        assertEquals("RSV-260918-HURV8", answer.reservation.referenceNo);
        assertEquals("Malabe Solar Hub", answer.reservation.stationName);
        assertEquals(12.5, answer.reservation.energyKwh, 0.001);
        assertEquals("0771234567", answer.prosumerPhone);
    }

    /** The code is sent to the verify endpoint exactly as it was scanned. */
    @Test
    public void sendsTheScannedCode() throws InterruptedException {
        api.willAnswer(200, Samples.checkIn(true, "Ready."));

        verify();
        TestWait.until(() -> checked.get() != null || failure.get() != null);

        RecordedRequest request = api.requestSent();
        assertEquals("POST", request.getMethod());
        assertEquals("/api/checkin/verify", request.getPath());
        assertTrue(request.getBody().readUtf8().contains(PAYLOAD));
    }

    /** Outside the window the API says no, and the app keeps its words. */
    @Test
    public void keepsTheReasonTheApiGave() {
        api.willAnswer(200, Samples.checkIn(false,
                "Check-in opens 15 minutes before the slot starts."));

        verify();

        TestWait.until(() -> checked.get() != null);
        assertFalse(checked.get().canComplete);
        assertEquals("Check-in opens 15 minutes before the slot starts.", checked.get().message);
    }

    /** A code from another station is refused with the message of the API. */
    @Test
    public void showsWhyACodeWasRefused() {
        api.willFail(403, Samples.problem("Wrong station", 403,
                "This booking belongs to another station."));

        verify();

        TestWait.until(() -> failure.get() != null);
        assertEquals("This booking belongs to another station.", failure.get().message);
    }

    /** Finishing the transfer records the energy that was really delivered. */
    @Test
    public void recordsTheDeliveredEnergy() throws InterruptedException {
        api.willAnswer(200, Samples.reservation("Completed", 11.8));

        AppContainer.get().checkIn().complete("66eb1f2c9a2b4c0012ab34cd", PAYLOAD, 11.8,
                new ApiCallback<ReservationDto>() {

                    /** The booking came back as completed. */
                    @Override
                    public void onSuccess(ReservationDto booking) {
                        completed.set(booking);
                    }

                    /** Not expected in this test. */
                    @Override
                    public void onError(ApiError error) {
                        failure.set(error);
                    }
                });

        TestWait.until(() -> completed.get() != null || failure.get() != null);
        assertNotNull("The transfer did not finish: " + failure.get(), completed.get());
        assertEquals("Completed", completed.get().status);
        assertEquals(11.8, completed.get().deliveredKwh, 0.001);

        RecordedRequest request = api.requestSent();
        assertEquals("/api/checkin/66eb1f2c9a2b4c0012ab34cd/complete", request.getPath());
        assertTrue(request.getBody().readUtf8().contains("11.8"));
    }

    /** Sends the code and keeps whichever answer comes back. */
    private void verify() {
        checked.set(null);
        failure.set(null);
        AppContainer.get().checkIn().verify(PAYLOAD, new ApiCallback<CheckInResponse>() {

            /** The API answered about the code. */
            @Override
            public void onSuccess(CheckInResponse response) {
                checked.set(response);
            }

            /** The API refused the code, or the server was not there. */
            @Override
            public void onError(ApiError error) {
                failure.set(error);
            }
        });
    }
}
