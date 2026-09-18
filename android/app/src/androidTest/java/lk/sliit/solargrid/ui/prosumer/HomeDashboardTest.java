/*
 * File:    HomeDashboardTest.java
 * Module:  Tests
 * Owner:   Malith
 * Purpose: Opens the prosumer home screen on the emulator and checks that the
 *          numbers and bookings from the API are shown, that an empty account
 *          is invited to book, and that a lost connection is explained.
 * Source:  AND-15 (Espresso).
 */
package lk.sliit.solargrid.ui.prosumer;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.action.ViewActions.scrollTo;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.hasDescendant;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static androidx.test.espresso.matcher.ViewMatchers.withId;
import static androidx.test.espresso.matcher.ViewMatchers.withText;

import static org.hamcrest.Matchers.allOf;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.LargeTest;

import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.model.Roles;
import lk.sliit.solargrid.testing.AppUnderTest;
import lk.sliit.solargrid.testing.Samples;

@LargeTest
@RunWith(AndroidJUnit4.class)
public class HomeDashboardTest {

    @Rule
    public AppUnderTest app = new AppUnderTest();

    /** Every test starts with a prosumer signed in. */
    @Before
    public void signInAsProsumer() {
        app.signIn(Roles.PROSUMER);
    }

    /** The two numbers the brief asks for, and the next booking, are on screen. */
    @Test
    public void showsTheNumbersAndTheNextBooking() {
        app.api.willAnswer(200, Samples.dashboard());

        ActivityScenario.launch(MainActivity.class);

        onView(allOf(withId(R.id.home_pending), hasDescendant(withText("2")))).check(matches(isDisplayed()));
        onView(allOf(withId(R.id.home_approved), hasDescendant(withText("3")))).check(matches(isDisplayed()));
        onView(allOf(withId(R.id.home_delivered), hasDescendant(withText("86.5")))).check(matches(isDisplayed()));
        onView(withId(R.id.home_next)).perform(scrollTo()).check(matches(hasDescendant(withText("Malabe Solar Hub"))));
        onView(withText("Kandy Lake Microgrid")).perform(scrollTo()).check(matches(isDisplayed()));
    }

    /** A prosumer with no bookings is invited to book a slot. */
    @Test
    public void invitesANewProsumerToBook() {
        app.api.willAnswer(200, Samples.emptyDashboard());

        ActivityScenario.launch(MainActivity.class);

        onView(withText(R.string.home_empty_title)).perform(scrollTo()).check(matches(isDisplayed()));
        onView(withId(R.id.home_book)).perform(scrollTo()).check(matches(isDisplayed()));
    }

    /** When the numbers cannot be loaded, the reason is shown. */
    @Test
    public void explainsAFailedRefresh() {
        app.api.willFail(503, Samples.problem("Service Unavailable", 503, "The database is not reachable."));

        ActivityScenario.launch(MainActivity.class);

        onView(withId(R.id.home_notice)).check(matches(allOf(isDisplayed(),
                withText("The database is not reachable."))));
    }
}
