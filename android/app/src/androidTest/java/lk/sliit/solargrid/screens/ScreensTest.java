/*
 * File:    ScreensTest.java
 * Module:  Tests
 * Owner:   Ravindu
 * Purpose: Walks the app on the emulator and saves a picture of every screen
 *          into the app folder on the phone. The script take-screenshots.ps1
 *          copies them into docs/screenshots/android for the report. Each
 *          member adds the shots of their own screens here.
 * Source:  AND-15 (Espresso), AND-22 (UiAutomator screenshots).
 */
package lk.sliit.solargrid.screens;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.action.ViewActions.closeSoftKeyboard;
import static androidx.test.espresso.action.ViewActions.replaceText;
import static androidx.test.espresso.action.ViewActions.scrollTo;
import static androidx.test.espresso.matcher.RootMatchers.isDialog;
import static androidx.test.espresso.matcher.ViewMatchers.withId;
import static androidx.test.espresso.matcher.ViewMatchers.withText;
import static androidx.test.platform.app.InstrumentationRegistry.getInstrumentation;

import android.graphics.Bitmap;

import androidx.test.core.app.ActivityScenario;
import androidx.test.espresso.Espresso;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.LargeTest;
import androidx.test.platform.io.PlatformTestStorageRegistry;

import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.IOException;
import java.io.OutputStream;

import lk.sliit.solargrid.AppContainer;
import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.model.Roles;
import lk.sliit.solargrid.testing.AppUnderTest;
import lk.sliit.solargrid.testing.Samples;
import lk.sliit.solargrid.ui.auth.LoginActivity;
import lk.sliit.solargrid.ui.auth.RegisterActivity;
import lk.sliit.solargrid.ui.common.ChangePasswordActivity;
import lk.sliit.solargrid.ui.operator.OperatorActivity;
import lk.sliit.solargrid.ui.prosumer.MainActivity;
import lk.sliit.solargrid.ui.prosumer.ProfileActivity;

@Screens
@LargeTest
@RunWith(AndroidJUnit4.class)
public class ScreensTest {

    private static final String CODE = "SSG1.66eb1f2c9a2b4c0012ab34cd.7f3a91.2b8c4d6e";

    @Rule
    public AppUnderTest app = new AppUnderTest();

    /** The sign-in screen, empty and with a refusal from the API. */
    @Test
    public void captureSignIn() {
        // The pictures go into the report, so the screen shows the address the
        // app really uses instead of the stand-in server of the test.
        AppContainer.get().useBaseUrl("http://10.0.2.2:8080/");

        ActivityScenario.launch(LoginActivity.class);
        shoot("01-login");

        AppContainer.get().useBaseUrl(app.api.address());

        app.api.willFail(403, Samples.problem("Account not active", 403,
                "Your account is waiting for Backoffice activation."));
        onView(withId(R.id.login_username)).perform(replaceText("tharindu@example.com"), closeSoftKeyboard());
        onView(withId(R.id.login_password)).perform(replaceText("Prosumer@123"), closeSoftKeyboard());
        onView(withId(R.id.login_submit)).perform(click());
        shoot("02-login-refused");
    }

    /** The prosumer home and the account tab. */
    @Test
    public void captureProsumerTabs() {
        app.api.willAnswer(200, Samples.login(Roles.PROSUMER));
        app.api.willAnswer(200, Samples.dashboard());

        ActivityScenario.launch(LoginActivity.class);
        onView(withId(R.id.login_username)).perform(replaceText("kasun@example.com"), closeSoftKeyboard());
        onView(withId(R.id.login_password)).perform(replaceText("Prosumer@123"), closeSoftKeyboard());
        onView(withId(R.id.login_submit)).perform(click());
        shoot("03-prosumer-home");

        // The account tab names the server, so the picture shows the real
        // address rather than the stand-in server of the test.
        AppContainer.get().useBaseUrl("http://10.0.2.2:8080/");
        onView(withId(R.id.tab_account)).perform(click());
        shoot("04-prosumer-account");
    }

    /** Malith: the sign-up form and the "waiting for activation" screen. */
    @Test
    public void captureSignUp() {
        app.api.willAnswer(201, Samples.profile("0712345678", "Pending"));

        ActivityScenario.launch(RegisterActivity.class);
        onView(withId(R.id.register_nic)).perform(replaceText("200034501234"), closeSoftKeyboard());
        onView(withId(R.id.register_name)).perform(replaceText("Kasun Perera"), closeSoftKeyboard());
        onView(withId(R.id.register_email)).perform(replaceText("kasun@example.com"), closeSoftKeyboard());
        shoot("09-register");

        onView(withId(R.id.register_phone)).perform(scrollTo(), replaceText("0712345678"), closeSoftKeyboard());
        onView(withId(R.id.register_address)).perform(scrollTo(), replaceText("No. 12, Temple Road, Malabe"),
                closeSoftKeyboard());
        onView(withId(R.id.register_password)).perform(scrollTo(), replaceText("Prosumer@123"), closeSoftKeyboard());
        onView(withId(R.id.register_confirm)).perform(scrollTo(), replaceText("Prosumer@123"), closeSoftKeyboard());
        onView(withId(R.id.register_submit)).perform(scrollTo(), click());
        shoot("10-register-waiting");
    }

    /** Malith: the profile form, the password form and the deactivation check. */
    @Test
    public void captureAccountScreens() {
        app.signIn(Roles.PROSUMER);
        app.api.willAnswer(200, Samples.profile("0712345678", "Active"));

        ActivityScenario<ProfileActivity> profile = ActivityScenario.launch(ProfileActivity.class);
        shoot("11-profile");
        profile.close();

        ActivityScenario<ChangePasswordActivity> password = ActivityScenario.launch(ChangePasswordActivity.class);
        onView(withId(R.id.password_current)).perform(replaceText("Prosumer@123"), closeSoftKeyboard());
        shoot("12-change-password");
        password.close();

        app.api.willAnswer(200, Samples.emptyDashboard());
        ActivityScenario.launch(MainActivity.class);
        shoot("13-home-nothing-booked");
        // The account tab names the server, so the picture shows the real address.
        AppContainer.get().useBaseUrl("http://10.0.2.2:8080/");
        onView(withId(R.id.tab_account)).perform(click());
        onView(withId(R.id.account_deactivate)).perform(scrollTo(), click());
        shoot("14-deactivate-confirm");
    }

    /** The operator screens: scanning, a booking ready to finish, and the summary. */
    @Test
    public void captureOperatorCheckIn() {
        app.signIn(Roles.GRID_OPERATOR);
        app.api.willAnswer(200, Samples.checkIn(true, "The booking is approved for this station."));
        app.api.willAnswer(200, Samples.reservation("Completed", 11.8));

        ActivityScenario.launch(OperatorActivity.class);
        shoot("05-operator-scan");

        onView(withId(R.id.scan_code)).perform(replaceText(CODE), closeSoftKeyboard());
        onView(withId(R.id.scan_check_code)).perform(click());
        shoot("06-operator-checkin-ready");

        onView(withId(R.id.delivered_kwh)).perform(replaceText("11.8"), closeSoftKeyboard());
        onView(withId(R.id.complete_action)).perform(click());
        onView(withText(R.string.operator_complete_action)).inRoot(isDialog()).perform(click());
        shoot("07-operator-transfer-completed");
    }

    /** A code the API will not accept yet, with the reason on screen. */
    @Test
    public void captureCheckInRefused() {
        app.signIn(Roles.GRID_OPERATOR);
        app.api.willAnswer(200, Samples.checkIn(false,
                "Check-in opens 15 minutes before the slot starts."));

        ActivityScenario.launch(OperatorActivity.class);
        onView(withId(R.id.scan_code)).perform(replaceText(CODE), closeSoftKeyboard());
        onView(withId(R.id.scan_check_code)).perform(click());
        shoot("08-operator-checkin-blocked");
    }

    /** Saves one picture of the screen, once the app has finished drawing. */
    private void shoot(String name) {
        Espresso.onIdle();
        hideKeyboard();

        Bitmap image = getInstrumentation().getUiAutomation().takeScreenshot();
        if (image == null) {
            throw new IllegalStateException("The phone did not give a picture for " + name + ".");
        }

        try (OutputStream file = PlatformTestStorageRegistry.getInstance().openOutputFile(name + ".png")) {
            image.compress(Bitmap.CompressFormat.PNG, 100, file);
        } catch (IOException problem) {
            throw new IllegalStateException("The picture " + name + " could not be written.", problem);
        } finally {
            image.recycle();
        }
    }

    /** The keyboard must be down, or it covers half of the picture. */
    private void hideKeyboard() {
        try {
            Espresso.closeSoftKeyboard();
            getInstrumentation().waitForIdleSync();
        } catch (RuntimeException noKeyboard) {
            // Nothing was open, which is what we wanted anyway.
        }
    }

}
