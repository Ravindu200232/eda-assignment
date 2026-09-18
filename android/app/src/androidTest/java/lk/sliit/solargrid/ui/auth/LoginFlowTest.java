/*
 * File:    LoginFlowTest.java
 * Module:  Tests
 * Owner:   Ravindu
 * Purpose: Signs in on the emulator and checks that each role lands on the
 *          right home screen, that empty boxes are marked, and that a refusal
 *          from the API is shown in the words the API used.
 * Source:  AND-15 (Espresso).
 */
package lk.sliit.solargrid.ui.auth;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.action.ViewActions.closeSoftKeyboard;
import static androidx.test.espresso.action.ViewActions.replaceText;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static androidx.test.espresso.matcher.ViewMatchers.withId;
import static androidx.test.espresso.matcher.ViewMatchers.withText;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.LargeTest;

import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.model.Roles;
import lk.sliit.solargrid.testing.AppUnderTest;
import lk.sliit.solargrid.testing.Samples;

@LargeTest
@RunWith(AndroidJUnit4.class)
public class LoginFlowTest {

    @Rule
    public AppUnderTest app = new AppUnderTest();

    /** A prosumer lands on the prosumer home with its four tabs. */
    @Test
    public void prosumerGoesToTheProsumerHome() {
        app.api.willAnswer(200, Samples.login(Roles.PROSUMER));

        ActivityScenario.launch(LoginActivity.class);
        signIn("kasun@example.com", "Prosumer@123");

        onView(withId(R.id.bottom_nav)).check(matches(isDisplayed()));
        onView(withId(R.id.tab_bookings)).check(matches(isDisplayed()));
    }

    /** A Grid Operator lands on the scanning screen instead. */
    @Test
    public void operatorGoesToTheStationDesk() {
        app.api.willAnswer(200, Samples.login(Roles.GRID_OPERATOR));

        ActivityScenario.launch(LoginActivity.class);
        signIn("operator@solargrid.lk", "Operator@123");

        onView(withId(R.id.scan_action)).check(matches(isDisplayed()));
        onView(withText(R.string.operator_scan_title)).check(matches(isDisplayed()));
    }

    /** Backoffice staff are told to use the web portal. */
    @Test
    public void backofficeIsSentToTheWebPortal() {
        app.api.willAnswer(200, Samples.login(Roles.BACKOFFICE));

        ActivityScenario.launch(LoginActivity.class);
        signIn("admin@solargrid.lk", "Backoffice@123");

        onView(withId(R.id.login_notice)).check(matches(isDisplayed()));
        onView(withText(R.string.login_backoffice)).check(matches(isDisplayed()));
    }

    /** Empty boxes are marked before anything is sent to the server. */
    @Test
    public void emptyBoxesAreMarked() {
        ActivityScenario.launch(LoginActivity.class);

        onView(withId(R.id.login_submit)).perform(click());

        onView(withText(R.string.login_missing_username)).check(matches(isDisplayed()));
        onView(withText(R.string.login_missing_password)).check(matches(isDisplayed()));
    }

    /** A refused account keeps the sentence the API wrote. */
    @Test
    public void showsTheReasonTheApiGave() {
        app.api.willFail(403, Samples.problem("Account not active", 403,
                "Your account is waiting for Backoffice activation."));

        ActivityScenario.launch(LoginActivity.class);
        signIn("kasun@example.com", "Prosumer@123");

        onView(withText("Your account is waiting for Backoffice activation."))
                .check(matches(isDisplayed()));
    }

    /** Fills the form and taps the button. */
    private void signIn(String username, String password) {
        onView(withId(R.id.login_username)).perform(replaceText(username), closeSoftKeyboard());
        onView(withId(R.id.login_password)).perform(replaceText(password), closeSoftKeyboard());
        onView(withId(R.id.login_submit)).perform(click());
    }
}
