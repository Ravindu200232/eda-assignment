/*
 * File:    StationsFlowTest.java
 * Module:  Tests
 * Owner:   Nimthara
 * Purpose: Walks the station screens on the emulator: the nearby stations in
 *          the list view, the station page with its hours and today's slots,
 *          and the operator bay counter. The phone is placed in Malabe, so the
 *          test never depends on a real GPS.
 * Source:  AND-15 (Espresso).
 */
package lk.sliit.solargrid.ui.map;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.action.ViewActions.scrollTo;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static androidx.test.espresso.matcher.ViewMatchers.withId;
import static androidx.test.espresso.matcher.ViewMatchers.withText;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import android.Manifest;

import androidx.test.core.app.ActivityScenario;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.LargeTest;
import androidx.test.rule.GrantPermissionRule;

import com.google.android.gms.maps.model.LatLng;

import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import lk.sliit.solargrid.AppContainer;
import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.model.Roles;
import lk.sliit.solargrid.testing.AppUnderTest;
import lk.sliit.solargrid.testing.Samples;
import lk.sliit.solargrid.ui.operator.OperatorActivity;
import lk.sliit.solargrid.ui.prosumer.MainActivity;
import okhttp3.mockwebserver.RecordedRequest;

@LargeTest
@RunWith(AndroidJUnit4.class)
public class StationsFlowTest {

    @Rule
    public AppUnderTest app = new AppUnderTest();

    @Rule
    public GrantPermissionRule location = GrantPermissionRule.grant(
            Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION);

    /** The phone "is" in Malabe for every test. */
    @Before
    public void placeThePhoneInMalabe() {
        AppContainer.get().useLocationFinder((context, answer) -> answer.onFound(new LatLng(6.9147, 79.9729)));
    }

    /** The nearby stations show in the list with their free bays, nearest first. */
    @Test
    public void listsTheNearbyStations() throws InterruptedException {
        app.signIn(Roles.PROSUMER);
        app.api.willAnswerPath("/api/dashboard", 200, Samples.emptyDashboard());
        app.api.willAnswerPath("/api/stations/nearby", 200, Samples.nearbyStations());

        ActivityScenario.launch(MainActivity.class);
        onView(withId(R.id.tab_map)).perform(click());
        onView(withId(R.id.stations_show_list)).perform(click());

        onView(withText("SLIIT Malabe Campus Microgrid")).check(matches(isDisplayed()));
        onView(withText("9 of 12 bays free")).check(matches(isDisplayed()));
        onView(withText("All bays in use")).check(matches(isDisplayed()));

        RecordedRequest first = app.api.requestSent();
        RecordedRequest second = app.api.requestSent();
        String nearby = first.getPath().startsWith("/api/stations") ? first.getPath() : second.getPath();
        assertTrue(nearby, nearby.startsWith("/api/stations/nearby?lat=6.914700&lng=79.972900"));
    }

    /** The station page shows the week and the slots of today. */
    @Test
    public void showsTheHoursAndTodaysSlots() {
        app.signIn(Roles.PROSUMER);
        app.api.willAnswerPath("/api/stations/st-mal/slots", 200, Samples.slotsToday());
        app.api.willAnswerPath("/api/stations/st-mal", 200, Samples.malabeStation(9));

        ActivityScenario.launch(StationDetailsActivity.intentFor(
                ApplicationProvider.getApplicationContext(), "st-mal"));

        onView(withId(R.id.station_name)).check(matches(withText("SLIIT Malabe Campus Microgrid")));
        onView(withText("3 of 5 bays free")).perform(scrollTo()).check(matches(isDisplayed()));
        onView(withText(R.string.slot_full)).perform(scrollTo()).check(matches(isDisplayed()));
        onView(withText(R.string.slot_closed)).perform(scrollTo()).check(matches(isDisplayed()));
    }

    /** An operator takes one bay away and saves; the API gets the new number. */
    @Test
    public void operatorSetsTheFreeBays() throws InterruptedException {
        app.signIn(Roles.GRID_OPERATOR);
        app.api.willAnswer(200, "[" + Samples.malabeStation(9) + "]");
        app.api.willAnswer(200, Samples.malabeStation(8));

        ActivityScenario.launch(OperatorActivity.class);
        onView(withId(R.id.tab_bays)).perform(click());
        onView(withId(R.id.bays_free)).check(matches(withText("9")));
        onView(withId(R.id.bays_minus)).perform(click());
        onView(withId(R.id.bays_save)).perform(scrollTo(), click());

        onView(withText("Saved: 8 of 12 bays are free at SLIIT Malabe Campus Microgrid."))
                .perform(scrollTo())
                .check(matches(isDisplayed()));
        app.api.requestSent();
        RecordedRequest saved = app.api.requestSent();
        assertEquals("PATCH", saved.getMethod());
        assertTrue(saved.getBody().readUtf8().contains("\"availableBatterySlots\":8"));
    }
}
