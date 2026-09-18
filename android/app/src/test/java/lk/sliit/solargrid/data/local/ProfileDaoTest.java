/*
 * File:    ProfileDaoTest.java
 * Module:  Tests
 * Owner:   Malith
 * Purpose: Checks the SQLite table that keeps the profile for offline use, and
 *          that logging out removes it together with the session.
 * Source:  AND-13 (Robolectric).
 */
package lk.sliit.solargrid.data.local;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;

import androidx.test.core.app.ApplicationProvider;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;

import lk.sliit.solargrid.data.model.Session;
import lk.sliit.solargrid.data.remote.dto.UserDto;

@RunWith(RobolectricTestRunner.class)
public class ProfileDaoTest {

    private SolarGridDbHelper helper;
    private ProfileDao dao;

    /** Opens a fresh database for each test. */
    @Before
    public void setUp() {
        helper = new SolarGridDbHelper(ApplicationProvider.getApplicationContext());
        dao = new ProfileDao(helper);
        helper.clearPersonalData();
    }

    /** Closes the database after each test. */
    @After
    public void tearDown() {
        helper.close();
    }

    /** Every field comes back as it was saved. */
    @Test
    public void savesAndReadsTheProfile() {
        dao.save(profile("0712345678", 5.5));

        UserDto saved = dao.find("200034501234");

        assertNotNull(saved);
        assertEquals("Kasun Perera", saved.fullName);
        assertEquals("0712345678", saved.phone);
        assertEquals("No. 12, Temple Road, Malabe", saved.address);
        assertEquals("CEB-MLB-10021", saved.meterNumber);
        assertEquals(5.5, saved.solarCapacityKw, 0.001);
    }

    /** A second save of the same NIC replaces the first. */
    @Test
    public void keepsTheNewestCopy() {
        dao.save(profile("0712345678", 5.5));
        dao.save(profile("0779998887", null));

        UserDto saved = dao.find("200034501234");

        assertNotNull(saved);
        assertEquals("0779998887", saved.phone);
        assertNull(saved.solarCapacityKw);
    }

    /** The profile of another NIC is never handed out. */
    @Test
    public void findsOnlyTheAskedNic() {
        dao.save(profile("0712345678", 5.5));

        assertNull(dao.find("199512345678"));
    }

    /** Logging out removes the profile and the session together. */
    @Test
    public void logOutForgetsEverythingPersonal() {
        dao.save(profile("0712345678", 5.5));
        UserDto user = profile("0712345678", 5.5);
        new SessionDao(helper).save(new Session("token", "2099-09-18T14:30:00Z", "2026-09-18T06:30:00Z", user));

        helper.clearPersonalData();

        assertNull(dao.find("200034501234"));
        assertNull(new SessionDao(helper).find());
    }

    /** A profile the way the API sends it. */
    private static UserDto profile(String phone, Double solarKw) {
        UserDto user = new UserDto();
        user.nic = "200034501234";
        user.fullName = "Kasun Perera";
        user.email = "kasun@example.com";
        user.phone = phone;
        user.role = "Prosumer";
        user.status = "Active";
        user.address = "No. 12, Temple Road, Malabe";
        user.meterNumber = "CEB-MLB-10021";
        user.solarCapacityKw = solarKw;
        return user;
    }
}
