/*
 * File:    OperatorCheckInTest.java
 * Module:  Tests
 * Owner:   Ravindu
 * Purpose: Walks the operator flow on the emulator: type a booking code, read
 *          what the server said, record the delivered energy and see the
 *          finished summary. The typed code is used instead of the camera, so
 *          the test needs no picture on screen.
 * Source:  AND-15 (Espresso).
 */
package lk.sliit.solargrid.ui.operator;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.action.ViewActions.closeSoftKeyboard;
import static androidx.test.espresso.action.ViewActions.replaceText;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.RootMatchers.isDialog;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static androidx.test.espresso.matcher.ViewMatchers.withId;
import static androidx.test.espresso.matcher.ViewMatchers.withText;

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
public class OperatorCheckInTest {

    private static final String CODE = "SSG1.66eb1f2c9a2b4c0012ab34cd.7f3a91.2b8c4d6e";

    @Rule
    public AppUnderTest app = new AppUnderTest();

    /** Every test starts with an operator already signed in. */
    @Before
    public void signInAsOperator() {
        app.signIn(Roles.GRID_OPERATOR);
    }

    /** A good code shows the booking and offers to finish the transfer. */
    @Test
    public void showsTheBookingBehindAGoodCode() {
        app.api.willAnswer(200, Samples.checkIn(true, "The booking is approved for this station."));

        ActivityScenario.launch(OperatorActivity.class);
        checkCode();

        onView(withText("RSV-260918-HURV8")).check(matches(isDisplayed()));
        onView(withText("Malabe Solar Hub")).check(matches(isDisplayed()));
        onView(withText(R.string.checkin_ready_title)).check(matches(isDisplayed()));
        onView(withId(R.id.complete_action)).check(matches(isDisplayed()));
    }

    /** Outside the check-in window the API says why, and nothing can be sent. */
    @Test
    public void explainsWhyATransferCannotStartYet() {
        app.api.willAnswer(200, Samples.checkIn(false,
                "Check-in opens 15 minutes before the slot starts."));

        ActivityScenario.launch(OperatorActivity.class);
        checkCode();

        onView(withText(R.string.checkin_blocked_title)).check(matches(isDisplayed()));
        onView(withText("Check-in opens 15 minutes before the slot starts."))
                .check(matches(isDisplayed()));
    }

    /** The whole flow: code, energy, confirm, summary. */
    @Test
    public void recordsTheDeliveredEnergy() {
        app.api.willAnswer(200, Samples.checkIn(true, "The booking is approved for this station."));
        app.api.willAnswer(200, Samples.reservation("Completed", 11.8));

        ActivityScenario.launch(OperatorActivity.class);
        checkCode();

        onView(withId(R.id.delivered_kwh)).perform(replaceText("11.8"), closeSoftKeyboard());
        onView(withId(R.id.complete_action)).perform(click());
        onView(withText(R.string.operator_complete_action)).inRoot(isDialog()).perform(click());

        onView(withText(R.string.operator_completed_title)).check(matches(isDisplayed()));
        onView(withId(R.id.done_next)).check(matches(isDisplayed()));
    }

    /** An empty energy box is marked instead of sending nothing. */
    @Test
    public void asksForTheDeliveredEnergy() {
        app.api.willAnswer(200, Samples.checkIn(true, "Ready."));

        ActivityScenario.launch(OperatorActivity.class);
        checkCode();

        onView(withId(R.id.delivered_kwh)).perform(replaceText(""), closeSoftKeyboard());
        onView(withId(R.id.complete_action)).perform(click());

        onView(withText(R.string.checkin_delivered_missing)).check(matches(isDisplayed()));
    }

    /** A code the API refuses is shown with its own message and a retry. */
    @Test
    public void showsWhyACodeWasRefused() {
        app.api.willFail(403, Samples.problem("Wrong station", 403,
                "This booking belongs to another station."));

        ActivityScenario.launch(OperatorActivity.class);
        checkCode();

        onView(withText("This booking belongs to another station.")).check(matches(isDisplayed()));
        onView(withId(R.id.error_retry)).check(matches(isDisplayed()));
    }

    /** Types the booking code and asks the server about it. */
    private void checkCode() {
        onView(withId(R.id.scan_code)).perform(replaceText(CODE), closeSoftKeyboard());
        onView(withId(R.id.scan_check_code)).perform(click());
    }
}
