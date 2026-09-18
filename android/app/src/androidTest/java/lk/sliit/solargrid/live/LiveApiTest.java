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
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static androidx.test.espresso.matcher.ViewMatchers.withId;
import static androidx.test.espresso.matcher.ViewMatchers.withText;

import androidx.test.core.app.ActivityScenario;
import androidx.test.espresso.IdlingRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.LargeTest;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.rule.GrantPermissionRule;

import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import lk.sliit.solargrid.AppContainer;
import lk.sliit.solargrid.BuildConfig;
import lk.sliit.solargrid.R;
import lk.sliit.solargrid.testing.ApiIdlingResource;
import lk.sliit.solargrid.ui.auth.LoginActivity;
import lk.sliit.solargrid.util.LocalNetwork;

@LiveApi
@LargeTest
@RunWith(AndroidJUnit4.class)
public class LiveApiTest {

    /** The emulator reaches the computer that runs it on 10.0.2.2. */
    private static final String DEFAULT_API = "http://10.0.2.2:5090/";

    private final ApiIdlingResource idling = new ApiIdlingResource();

    /** The test API lives on the computer, which Android 17 counts as the local network. */
    @Rule
    public GrantPermissionRule localNetwork = GrantPermissionRule.grant(LocalNetwork.PERMISSION);

    /** Points the app at the test API and signs nobody in. */
    @Before
    public void setUp() {
        String baseUrl = InstrumentationRegistry.getArguments().getString("apiBaseUrl", DEFAULT_API);
        AppContainer.get().useBaseUrl(baseUrl);
        AppContainer.get().session().clear();
        IdlingRegistry.getInstance().register(idling);
    }

    /** Puts the app back to its normal address. */
    @After
    public void tearDown() {
        AppContainer.get().session().clear();
        AppContainer.get().useBaseUrl(BuildConfig.API_BASE_URL);
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

    /** Fills the form and taps the button. */
    private void signIn(String username, String password) {
        onView(withId(R.id.login_username)).perform(replaceText(username), closeSoftKeyboard());
        onView(withId(R.id.login_password)).perform(replaceText(password), closeSoftKeyboard());
        onView(withId(R.id.login_submit)).perform(click());
    }
}
