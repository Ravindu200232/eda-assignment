/*
 * File:    LiveApiTest.java
 * Module:  Tests
 * Owner:   Ravindu
 * Purpose: Signs in against a real Web API with demo data, so we know the app
 *          and the server still fit together: the JSON shapes, the roles and
 *          the refusal messages. The script android/scripts/run-e2e.ps1 starts
 *          the API on port 5090 with a throw-away database and runs these.
 * Source:  AND-15 (Espresso).
 */
package lk.sliit.solargrid.live;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.action.ViewActions.closeSoftKeyboard;
import static androidx.test.espresso.action.ViewActions.replaceText;
import static androidx.test.espresso.action.ViewActions.scrollTo;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.RootMatchers.isDialog;
import static androidx.test.espresso.matcher.ViewMatchers.isAssignableFrom;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static androidx.test.espresso.matcher.ViewMatchers.withId;
import static androidx.test.espresso.matcher.ViewMatchers.withText;

import static lk.sliit.solargrid.testing.TabActions.selectTab;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;

import android.Manifest;
import android.view.View;
import android.widget.TextView;

import androidx.test.core.app.ActivityScenario;
import androidx.test.espresso.IdlingRegistry;
import androidx.test.espresso.UiController;
import androidx.test.espresso.ViewAction;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.LargeTest;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.rule.GrantPermissionRule;

import com.google.android.gms.maps.model.LatLng;

import org.hamcrest.Matcher;

import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.time.LocalDate;
import java.util.Locale;

import lk.sliit.solargrid.AppContainer;
import lk.sliit.solargrid.BuildConfig;
import lk.sliit.solargrid.R;
import lk.sliit.solargrid.testing.ApiIdlingResource;
import lk.sliit.solargrid.ui.auth.LoginActivity;
import lk.sliit.solargrid.ui.auth.RegisterActivity;
import lk.sliit.solargrid.util.LocalNetwork;
import lk.sliit.solargrid.util.LocationFinder;
import lk.sliit.solargrid.util.Times;

@LiveApi
@LargeTest
@RunWith(AndroidJUnit4.class)
public class LiveApiTest {

    /** The emulator reaches the computer that runs it on 10.0.2.2. */
    private static final String DEFAULT_API = "http://10.0.2.2:5090/";

    private final ApiIdlingResource idling = new ApiIdlingResource();

    /**
     * The test API lives on the computer, which Android 17 counts as the local
     * network; the map needs the location as well.
     */
    @Rule
    public GrantPermissionRule permissions = GrantPermissionRule.grant(LocalNetwork.PERMISSION,
            Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION);

    /** Points the app at the test API and signs nobody in. */
    @Before
    public void setUp() {
        String baseUrl = InstrumentationRegistry.getArguments().getString("apiBaseUrl", DEFAULT_API);
        AppContainer.get().useBaseUrl(baseUrl);
        AppContainer.get().session().clear();
        IdlingRegistry.getInstance().register(idling);
    }

    /** Puts the app back to its normal address and location finder. */
    @After
    public void tearDown() {
        AppContainer.get().session().clear();
        AppContainer.get().useBaseUrl(BuildConfig.API_BASE_URL);
        AppContainer.get().useLocationFinder(new LocationFinder.Fused());
        IdlingRegistry.getInstance().unregister(idling);
    }

    /** The demo prosumer signs in and reaches the prosumer home. */
    @Test
    public void prosumerSignsIn() {
        ActivityScenario.launch(LoginActivity.class);
        signIn("kasun@example.com", "Prosumer@123");

        onView(withId(R.id.bottom_nav)).check(matches(isDisplayed()));
        onView(withId(R.id.tab_bookings)).check(matches(isDisplayed()));
    }

    /** The demo Grid Operator reaches the scanning screen. */
    @Test
    public void operatorSignsIn() {
        ActivityScenario.launch(LoginActivity.class);
        signIn("operator@solargrid.lk", "Operator@123");

        onView(withId(R.id.scan_action)).check(matches(isDisplayed()));
    }

    /** An account still waiting for activation is refused by the API. */
    @Test
    public void pendingAccountIsRefused() {
        ActivityScenario.launch(LoginActivity.class);
        signIn("tharindu@example.com", "Prosumer@123");

        onView(withId(R.id.login_notice)).check(matches(isDisplayed()));
    }

    /** A deactivated account is refused as well. */
    @Test
    public void deactivatedAccountIsRefused() {
        ActivityScenario.launch(LoginActivity.class);
        signIn("dilani@example.com", "Prosumer@123");

        onView(withId(R.id.login_notice)).check(matches(isDisplayed()));
    }

    /** A wrong password never reaches a home screen. */
    @Test
    public void wrongPasswordIsRefused() {
        ActivityScenario.launch(LoginActivity.class);
        signIn("kasun@example.com", "WrongPassword1");

        onView(withId(R.id.login_notice)).check(matches(isDisplayed()));
        onView(withId(R.id.login_submit)).check(matches(isDisplayed()));
    }

    /**
     * Malith: a real sign-up creates an account that must wait for the
     * Backoffice, so signing in with it straight away is refused.
     */
    @Test
    public void signUpWaitsForTheBackoffice() {
        // A new NIC each run: year 1999, day 123 of the year, then five digits.
        String digits = String.format(Locale.ROOT, "%05d", System.currentTimeMillis() % 100000);
        String nic = "1999123" + digits;
        String email = "android" + digits + "@example.com";

        ActivityScenario.launch(RegisterActivity.class);
        type(R.id.register_nic, nic);
        type(R.id.register_name, "Android Test Prosumer");
        type(R.id.register_email, email);
        type(R.id.register_phone, "0712345678");
        type(R.id.register_address, "No. 1, Test Road, Malabe");
        type(R.id.register_password, "Solar2026x");
        type(R.id.register_confirm, "Solar2026x");
        onView(withId(R.id.register_submit)).perform(scrollTo(), click());

        onView(withText(R.string.registered_title)).check(matches(isDisplayed()));
        onView(withId(R.id.registered_login)).perform(click());

        signIn(email, "Solar2026x");
        onView(withId(R.id.login_notice)).check(matches(isDisplayed()));
    }

    /**
     * Nimthara: the nearby search of the real API finds the demo stations
     * around Malabe, and the list view shows them with their free bays.
     */
    @Test
    public void prosumerSeesNearbyStations() {
        AppContainer.get().useLocationFinder((context, answer) -> answer.onFound(new LatLng(6.9147, 79.9729)));
        ActivityScenario.launch(LoginActivity.class);
        signIn("kasun@example.com", "Prosumer@123");

        onView(withId(R.id.tab_map)).perform(click());
        onView(withId(R.id.stations_show_list)).perform(click());

        onView(withText("SLIIT Malabe Campus Microgrid")).check(matches(isDisplayed()));
    }

    /**
     * Hamnad: the prosumer books a free slot at Malabe four days ahead through
     * the real API, lands on the summary, opens the booking and cancels it.
     */
    @Test
    public void prosumerBooksAndCancels() {
        ActivityScenario.launch(LoginActivity.class);
        signIn("kasun@example.com", "Prosumer@123");

        onView(withId(R.id.tab_bookings)).perform(click());
        onView(withId(R.id.bookings_new)).perform(click());
        onView(withText("SLIIT Malabe Campus Microgrid")).perform(click());
        LocalDate day = Times.today().plusDays(4);
        onView(withText(Times.dayChip(day))).perform(scrollTo(), click());
        onView(withText(startsWith("10:00 - 12:00"))).perform(scrollTo(), click());
        onView(withId(R.id.wizard_next)).perform(click());
        onView(withId(R.id.wizard_trade_export)).perform(click());
        type(R.id.wizard_energy, "5");
        onView(withId(R.id.wizard_next)).perform(click());
        onView(withId(R.id.wizard_next)).perform(click());

        onView(withId(R.id.result_title)).check(matches(withText(R.string.result_created_title)));
        onView(withId(R.id.result_status)).check(matches(withText(R.string.status_pending)));

        onView(withId(R.id.result_open)).perform(scrollTo(), click());
        onView(withId(R.id.details_cancel)).perform(scrollTo(), click());
        onView(withId(android.R.id.button1)).inRoot(isDialog()).perform(click());

        onView(withId(R.id.result_title)).check(matches(withText(R.string.result_cancelled_title)));
        onView(withId(R.id.result_status)).check(matches(withText(R.string.status_cancelled)));
    }

    /** Hamnad: the demo booking that waits for approval is in the Waiting tab. */
    @Test
    public void prosumerSeesTheWaitingBooking() {
        ActivityScenario.launch(LoginActivity.class);
        signIn("kasun@example.com", "Prosumer@123");

        onView(withId(R.id.tab_bookings)).perform(click());
        onView(withId(R.id.bookings_tabs)).perform(selectTab(1));

        onView(withText(containsString("RSV-DEMO-0003"))).check(matches(isDisplayed()));
    }

    /**
     * Hamnad: the QR code the app draws for an approved booking carries the
     * signed text of the API, and the operator's check of that text finds the
     * same booking. Its slot is hours away, so the API says it cannot be
     * finished yet.
     */
    @Test
    public void qrCodeOfTheAppPassesTheOperatorCheck() {
        ActivityScenario.launch(LoginActivity.class);
        signIn("kasun@example.com", "Prosumer@123");
        onView(withId(R.id.tab_bookings)).perform(click());
        onView(withText(containsString("RSV-DEMO-0002"))).perform(click());
        onView(withId(R.id.details_qr)).perform(scrollTo()).check(matches(isDisplayed()));
        String payload = textOf(R.id.details_qr_text);

        AppContainer.get().session().clear();
        ActivityScenario.launch(LoginActivity.class);
        signIn("operator@solargrid.lk", "Operator@123");
        onView(withId(R.id.scan_code)).perform(replaceText(payload), closeSoftKeyboard());
        onView(withId(R.id.scan_check_code)).perform(click());

        onView(withId(R.id.booking_reference)).perform(scrollTo()).check(matches(withText("RSV-DEMO-0002")));
        onView(withId(R.id.result_title)).check(matches(withText(R.string.checkin_blocked_title)));
    }

    /** Hamnad: the operator's list of the day reads the real booking list and staff numbers. */
    @Test
    public void operatorSeesTheBookingsOfTheDay() {
        ActivityScenario.launch(LoginActivity.class);
        signIn("operator@solargrid.lk", "Operator@123");

        onView(withId(R.id.tab_today)).perform(click());

        onView(withId(R.id.today_count_pending)).check(matches(not(withText(R.string.no_number))));
        onView(withId(R.id.today_count_approved)).check(matches(not(withText(R.string.no_number))));
        onView(withId(R.id.today_list)).check(matches(isDisplayed()));
    }

    /** Reads the text a view shows, such as the QR text under the picture. */
    private static String textOf(int viewId) {
        String[] text = new String[1];
        onView(withId(viewId)).perform(new ViewAction() {

            /** Only text views have text to read. */
            @Override
            public Matcher<View> getConstraints() {
                return isAssignableFrom(TextView.class);
            }

            /** What Espresso prints if this step fails. */
            @Override
            public String getDescription() {
                return "read the text";
            }

            /** Copies the text out of the view. */
            @Override
            public void perform(UiController uiController, View view) {
                text[0] = ((TextView) view).getText().toString();
            }
        });
        return text[0];
    }

    /** Scrolls to a box and types into it. */
    private static void type(int boxId, String text) {
        onView(withId(boxId)).perform(scrollTo(), replaceText(text), closeSoftKeyboard());
    }

    /** Fills the form and taps the button. */
    private void signIn(String username, String password) {
        onView(withId(R.id.login_username)).perform(replaceText(username), closeSoftKeyboard());
        onView(withId(R.id.login_password)).perform(replaceText(password), closeSoftKeyboard());
        onView(withId(R.id.login_submit)).perform(click());
    }
}
