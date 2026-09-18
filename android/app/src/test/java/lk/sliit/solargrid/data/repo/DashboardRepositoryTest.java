/*
 * File:    DashboardRepositoryTest.java
 * Module:  Tests
 * Owner:   Malith
 * Purpose: Checks that the home screen numbers are read exactly as the API
 *          counted them, including the next booking and the list after it.
 * Source:  AND-13 (Robolectric), AND-14 (MockWebServer).
 */
package lk.sliit.solargrid.data.repo;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;

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
import lk.sliit.solargrid.data.remote.dto.ProsumerDashboardDto;
import lk.sliit.solargrid.testing.FakeApi;
import lk.sliit.solargrid.testing.Samples;
import lk.sliit.solargrid.testing.TestWait;

@RunWith(RobolectricTestRunner.class)
public class DashboardRepositoryTest {

    private final FakeApi api = new FakeApi();
    private final AtomicReference<ProsumerDashboardDto> answer = new AtomicReference<>();
    private final AtomicReference<ApiError> failure = new AtomicReference<>();

    /** Starts the stand-in server. */
    @Before
    public void setUp() throws IOException {
        api.start();
    }

    /** Stops the stand-in server. */
    @After
    public void tearDown() throws IOException {
        api.stop();
    }

    /** The four numbers and the bookings arrive as the API sent them. */
    @Test
    public void readsTheNumbersAndBookings() throws InterruptedException {
        api.willAnswer(200, Samples.dashboard());

        load();

        ProsumerDashboardDto dashboard = answer.get();
        assertNotNull("The dashboard failed: " + failure.get(), dashboard);
        assertEquals(2, dashboard.pendingCount);
        assertEquals(3, dashboard.approvedFutureCount);
        assertEquals(7, dashboard.completedCount);
        assertEquals(86.5, dashboard.totalDeliveredKwh, 0.001);
        assertEquals("RSV-260918-HURV8", dashboard.nextReservation.referenceNo);
        assertEquals(2, dashboard.upcomingReservations.size());
        assertEquals("/api/dashboard/my-summary", api.requestSent().getPath());
    }

    /** With nothing booked there is no next booking and an empty list. */
    @Test
    public void readsAnEmptyDashboard() {
        api.willAnswer(200, Samples.emptyDashboard());

        load();

        assertNull(answer.get().nextReservation);
        assertEquals(0, answer.get().upcomingReservations.size());
    }

    /** Loads the dashboard and waits for the answer. */
    private void load() {
        AppContainer.get().dashboard().load(new ApiCallback<ProsumerDashboardDto>() {

            /** The numbers arrived. */
            @Override
            public void onSuccess(ProsumerDashboardDto result) {
                answer.set(result);
            }

            /** The call failed. */
            @Override
            public void onError(ApiError error) {
                failure.set(error);
            }
        });
        TestWait.until(() -> answer.get() != null || failure.get() != null);
    }
}
