/*
 * File:    ProfileFlowTest.java
 * Module:  Tests
 * Owner:   Malith
 * Purpose: Walks the account screens on the emulator: edit the profile, change
 *          the password, and deactivate the account with a wrong and then the
 *          right password.
 * Source:  AND-15 (Espresso).
 */
package lk.sliit.solargrid.ui.prosumer;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.action.ViewActions.closeSoftKeyboard;
import static androidx.test.espresso.action.ViewActions.replaceText;
import static androidx.test.espresso.action.ViewActions.scrollTo;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.RootMatchers.isDialog;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static androidx.test.espresso.matcher.ViewMatchers.withId;
import static androidx.test.espresso.matcher.ViewMatchers.withText;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

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
import lk.sliit.solargrid.ui.common.ChangePasswordActivity;
import okhttp3.mockwebserver.RecordedRequest;

@LargeTest
@RunWith(AndroidJUnit4.class)
public class ProfileFlowTest {

    @Rule
    public AppUnderTest app = new AppUnderTest();

    /** Every test starts with a prosumer signed in. */
    @Before
    public void signInAsProsumer() {
        app.signIn(Roles.PROSUMER);
    }

    /** A changed phone number is saved, and the whole profile is sent. */
    @Test
    public void savesTheProfile() throws InterruptedException {
        app.api.willAnswer(200, Samples.profile("0712345678", "Active"));
        app.api.willAnswer(200, Samples.profile("0779998887", "Active"));

        ActivityScenario.launch(ProfileActivity.class);
        onView(withId(R.id.profile_phone)).perform(scrollTo(), replaceText("0779998887"), closeSoftKeyboard());
        onView(withId(R.id.profile_save)).perform(scrollTo(), click());

        onView(withText(R.string.profile_saved)).perform(scrollTo()).check(matches(isDisplayed()));
        app.api.requestSent();
        RecordedRequest saved = app.api.requestSent();
        assertEquals("PUT", saved.getMethod());
        String body = saved.getBody().readUtf8();
        assertTrue(body, body.contains("\"phone\":\"0779998887\""));
        assertTrue(body, body.contains("\"meterNumber\":\"CEB-MLB-10021\""));
    }

    /** A new password is sent once it was typed the same way twice. */
    @Test
    public void changesThePassword() {
        app.api.willAnswerEmpty(204);

        ActivityScenario.launch(ChangePasswordActivity.class);
        onView(withId(R.id.password_current)).perform(replaceText("Prosumer@123"), closeSoftKeyboard());
        onView(withId(R.id.password_new)).perform(replaceText("Solar2026"), closeSoftKeyboard());
        onView(withId(R.id.password_confirm)).perform(replaceText("Solar2026"), closeSoftKeyboard());
        onView(withId(R.id.password_save)).perform(click());

        onView(withText(R.string.account_password_changed)).check(matches(isDisplayed()));
    }

    /** A wrong password keeps the dialog open with the reason from the API. */
    @Test
    public void wrongPasswordKeepsTheAccount() {
        openDeactivateDialog();
        app.api.willFail(400, Samples.problem("Business rule", 400, "Password is incorrect."));

        onView(withId(R.id.dialog_password)).inRoot(isDialog()).perform(replaceText("wrong"), closeSoftKeyboard());
        onView(withText(R.string.account_deactivate)).inRoot(isDialog()).perform(click());

        onView(withText("Password is incorrect.")).inRoot(isDialog()).check(matches(isDisplayed()));
    }

    /** The right password closes the account and returns to the login screen. */
    @Test
    public void deactivationReturnsToLogin() {
        openDeactivateDialog();
        app.api.willAnswerEmpty(204);

        onView(withId(R.id.dialog_password)).inRoot(isDialog()).perform(replaceText("Prosumer@123"), closeSoftKeyboard());
        onView(withText(R.string.account_deactivate)).inRoot(isDialog()).perform(click());

        onView(withText(R.string.deactivate_done)).check(matches(isDisplayed()));
    }

    /**
     * Opens the Account tab and taps "Deactivate my account". The home tab asks
     * for the dashboard first, so that answer is queued before any other.
     */
    private void openDeactivateDialog() {
        app.api.willAnswer(200, Samples.emptyDashboard());
        ActivityScenario.launch(MainActivity.class);
        onView(withId(R.id.tab_account)).perform(click());
        onView(withId(R.id.account_deactivate)).perform(scrollTo(), click());
    }
}
