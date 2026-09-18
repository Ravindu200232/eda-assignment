/*
 * File:    RegisterFlowTest.java
 * Module:  Tests
 * Owner:   Malith
 * Purpose: Walks the sign-up on the emulator: a good sign-up ends on the
 *          "waiting for activation" screen, and the checks of the phone and
 *          of the API show up where the prosumer can see them.
 * Source:  AND-15 (Espresso).
 */
package lk.sliit.solargrid.ui.auth;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.action.ViewActions.closeSoftKeyboard;
import static androidx.test.espresso.action.ViewActions.replaceText;
import static androidx.test.espresso.action.ViewActions.scrollTo;
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
import lk.sliit.solargrid.testing.AppUnderTest;
import lk.sliit.solargrid.testing.Samples;

@LargeTest
@RunWith(AndroidJUnit4.class)
public class RegisterFlowTest {

    @Rule
    public AppUnderTest app = new AppUnderTest();

    /** A good sign-up ends on the screen that explains the waiting. */
    @Test
    public void signUpWaitsForActivation() {
        app.api.willAnswer(201, Samples.profile("0712345678", "Pending"));

        ActivityScenario.launch(RegisterActivity.class);
        fillForm("Prosumer@123", "Prosumer@123");
        onView(withId(R.id.register_submit)).perform(scrollTo(), click());

        onView(withText(R.string.registered_title)).check(matches(isDisplayed()));
        onView(withId(R.id.registered_login)).check(matches(isDisplayed()));
    }

    /** Two different passwords are caught before anything is sent. */
    @Test
    public void catchesDifferentPasswords() {
        ActivityScenario.launch(RegisterActivity.class);
        fillForm("Prosumer@123", "Prosumer@124");
        onView(withId(R.id.register_submit)).perform(scrollTo(), click());

        onView(withText(R.string.password_mismatch)).check(matches(isDisplayed()));
    }

    /** A NIC that is already used is explained in the words of the API. */
    @Test
    public void explainsAUsedNic() {
        app.api.willFail(409, Samples.problem("Conflict", 409,
                "An account with this NIC already exists."));

        ActivityScenario.launch(RegisterActivity.class);
        fillForm("Prosumer@123", "Prosumer@123");
        onView(withId(R.id.register_submit)).perform(scrollTo(), click());

        onView(withText("An account with this NIC already exists.")).check(matches(isDisplayed()));
    }

    /** A field the API refuses is marked under its own box. */
    @Test
    public void marksTheBoxTheApiNamed() {
        app.api.willFail(400, Samples.fieldProblem("Phone",
                "Phone number must look like 0771234567 or +94771234567."));

        ActivityScenario.launch(RegisterActivity.class);
        fillForm("Prosumer@123", "Prosumer@123");
        onView(withId(R.id.register_submit)).perform(scrollTo(), click());

        onView(withText(R.string.form_check_marked)).check(matches(isDisplayed()));
        onView(withText("Phone number must look like 0771234567 or +94771234567."))
                .perform(scrollTo())
                .check(matches(isDisplayed()));
    }

    /** Fills every box of the sign-up form. */
    private void fillForm(String password, String again) {
        type(R.id.register_nic, "200034501234");
        type(R.id.register_name, "Kasun Perera");
        type(R.id.register_email, "kasun@example.com");
        type(R.id.register_phone, "0712345678");
        type(R.id.register_address, "No. 12, Temple Road, Malabe");
        type(R.id.register_meter, "CEB-MLB-10021");
        type(R.id.register_solar, "5.5");
        type(R.id.register_password, password);
        type(R.id.register_confirm, again);
    }

    /** Scrolls to a box and types into it. */
    private static void type(int boxId, String text) {
        onView(withId(boxId)).perform(scrollTo(), replaceText(text), closeSoftKeyboard());
    }
}
