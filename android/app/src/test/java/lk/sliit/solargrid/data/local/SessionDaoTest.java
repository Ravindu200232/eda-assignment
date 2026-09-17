/*
 * File:    SessionDaoTest.java
 * Module:  Tests
 * Owner:   Ravindu
 * Purpose: Checks the SQLite table that keeps the login: it saves one row,
 *          replaces it on the next login, reads it back and forgets it on
 *          logout.
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

import lk.sliit.solargrid.data.model.Roles;
import lk.sliit.solargrid.data.model.Session;
import lk.sliit.solargrid.data.remote.dto.UserDto;

@RunWith(RobolectricTestRunner.class)
public class SessionDaoTest {

    private SolarGridDbHelper helper;
    private SessionDao dao;

    /** Opens a fresh database for each test. */
    @Before
    public void setUp() {
        helper = new SolarGridDbHelper(ApplicationProvider.getApplicationContext());
        dao = new SessionDao(helper);
        dao.clear();
    }

    /** Closes the database after each test. */
    @After
    public void tearDown() {
        helper.close();
    }

    /** With nobody signed in, there is nothing to read. */
    @Test
    public void findsNothingAtTheStart() {
        assertNull(dao.find());
    }

    /** The saved login comes back with every detail. */
    @Test
    public void savesAndReadsTheLogin() {
        dao.save(sessionFor("199512345678", "Kasun Perera", Roles.PROSUMER));

        Session saved = dao.find();

        assertNotNull(saved);
        assertEquals("test-token", saved.token);
        assertEquals("2099-09-18T14:30:00Z", saved.expiresAt);
        assertEquals("199512345678", saved.user.nic);
        assertEquals("Kasun Perera", saved.user.fullName);
        assertEquals(Roles.PROSUMER, saved.user.role);
        assertEquals("Active", saved.user.status);
    }

    /** A second login replaces the first one; there is only ever one row. */
    @Test
    public void keepsOnlyTheNewestLogin() {
        dao.save(sessionFor("199512345678", "Kasun Perera", Roles.PROSUMER));
        dao.save(sessionFor("198800112233", "Nimal Silva", Roles.GRID_OPERATOR));

        Session saved = dao.find();

        assertNotNull(saved);
        assertEquals("Nimal Silva", saved.user.fullName);
        assertEquals(Roles.GRID_OPERATOR, saved.user.role);
    }

    /** Logging out leaves nothing behind. */
    @Test
    public void forgetsTheLoginOnLogout() {
        dao.save(sessionFor("199512345678", "Kasun Perera", Roles.PROSUMER));

        dao.clear();

        assertNull(dao.find());
    }

    /** Builds a session the way a login answer would. */
    private static Session sessionFor(String nic, String fullName, String role) {
        UserDto user = new UserDto();
        user.nic = nic;
        user.fullName = fullName;
        user.email = "kasun@example.com";
        user.phone = "0771234567";
        user.role = role;
        user.status = "Active";
        return new Session("test-token", "2099-09-18T14:30:00Z", "2026-09-18T06:30:00Z", user);
    }
}
