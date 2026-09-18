/*
 * File:    ReservationDaoTest.java
 * Module:  Tests
 * Owner:   Hamnad
 * Purpose: Checks the SQLite copy of the bookings: every field comes back,
 *          the soonest slot is first, a copy never allows a change, a slot
 *          that ended since it was saved counts as past, and logging out
 *          removes the bookings.
 * Source:  AND-13 (Robolectric).
 */
package lk.sliit.solargrid.data.local;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import androidx.test.core.app.ApplicationProvider;

import com.google.gson.Gson;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;

import java.util.List;

import lk.sliit.solargrid.data.remote.dto.ReservationDto;
import lk.sliit.solargrid.testing.Samples;

@RunWith(RobolectricTestRunner.class)
public class ReservationDaoTest {

    private static final Gson GSON = new Gson();

    private SolarGridDbHelper helper;
    private ReservationDao dao;

    /** Opens a fresh database for each test. */
    @Before
    public void setUp() {
        helper = new SolarGridDbHelper(ApplicationProvider.getApplicationContext());
        dao = new ReservationDao(helper);
        helper.clearPersonalData();
    }

    /** Closes the database after each test. */
    @After
    public void tearDown() {
        helper.close();
    }

    /** Every field of the booking and its history comes back as it was saved. */
    @Test
    public void savesAndReadsABooking() {
        ReservationDto original = booking("bk-1", "RSV-1", "Completed", -30);
        dao.saveAll(List.of(original));

        ReservationDto saved = dao.find("bk-1");

        assertNotNull(saved);
        assertEquals("RSV-1", saved.referenceNo);
        assertEquals("SLIIT Malabe Campus Microgrid", saved.stationName);
        assertEquals(original.startTime, saved.startTime);
        assertEquals(original.endTime, saved.endTime);
        assertEquals("Export", saved.tradeType);
        assertEquals(12.5, saved.energyKwh, 0.001);
        assertEquals(12.0, saved.deliveredKwh, 0.001);
        assertEquals("Completed", saved.status);
        assertEquals(Samples.MY_NIC, saved.createdBy);
        assertEquals(original.approvedAt, saved.approvedAt);
        assertEquals(original.completedAt, saved.completedAt);
        assertTrue(saved.isPast);
    }

    /** The list starts with the soonest slot. */
    @Test
    public void listsTheSoonestSlotFirst() {
        dao.saveAll(List.of(
                booking("bk-late", "RSV-LATE", "Pending", 50),
                booking("bk-soon", "RSV-SOON", "Approved", 20)));

        List<ReservationDto> saved = dao.findAll();

        assertEquals(2, saved.size());
        assertEquals("RSV-SOON", saved.get(0).referenceNo);
        assertEquals("RSV-LATE", saved.get(1).referenceNo);
    }

    /** A copy on the phone never allows a change; only the API may say so. */
    @Test
    public void aSavedCopyNeverAllowsAChange() {
        ReservationDto original = booking("bk-1", "RSV-1", "Approved", 40);
        assertTrue(original.canModify);
        dao.saveAll(List.of(original));

        assertFalse(dao.find("bk-1").canModify);
    }

    /** Saving the same booking again keeps only the newest copy. */
    @Test
    public void keepsTheNewestCopy() {
        dao.saveAll(List.of(booking("bk-1", "RSV-1", "Pending", 40)));
        dao.saveAll(List.of(booking("bk-1", "RSV-1", "Cancelled", 40)));

        assertEquals(1, dao.findAll().size());
        assertEquals("Cancelled", dao.find("bk-1").status);
        assertEquals("Plans changed", dao.find("bk-1").reason);
    }

    /** A slot that ended after the copy was saved is shown as past. */
    @Test
    public void aSlotThatEndedSinceSavingIsPast() {
        ReservationDto original = booking("bk-1", "RSV-1", "Approved", -5);
        original.isPast = false;
        dao.saveAll(List.of(original));

        assertTrue(dao.find("bk-1").isPast);
    }

    /** Logging out removes the bookings with the session. */
    @Test
    public void logoutRemovesTheBookings() {
        dao.saveAll(List.of(booking("bk-1", "RSV-1", "Pending", 40)));

        helper.clearPersonalData();

        assertTrue(dao.findAll().isEmpty());
        assertNull(dao.find("bk-1"));
    }

    /** A sample booking read the way the app reads the API answer. */
    private static ReservationDto booking(String id, String reference, String status, long startsInHours) {
        return GSON.fromJson(Samples.booking(id, reference, status, startsInHours), ReservationDto.class);
    }
}
