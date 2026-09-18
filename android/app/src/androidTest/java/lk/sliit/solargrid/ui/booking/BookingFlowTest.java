/*
 * File:    BookingFlowTest.java
 * Module:  Tests
 * Owner:   Hamnad
 * Purpose: Walks the booking screens on the emulator against a stand-in API:
 *          booking a slot and changing a booking through the form, the QR
 *          code of an approved booking, cancelling with a reason, the rule
 *          that hides changes inside 12 hours, the list tabs and filters, and
 *          an operator cancelling for a prosumer. Every action must end on
 *          the summary screen.
 * Source:  AND-15 (Espresso), AND-14 (MockWebServer).
 */
package lk.sliit.solargrid.ui.booking;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.action.ViewActions.closeSoftKeyboard;
import static androidx.test.espresso.action.ViewActions.pressImeActionButton;
import static androidx.test.espresso.action.ViewActions.replaceText;
import static androidx.test.espresso.action.ViewActions.scrollTo;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.RootMatchers.isDialog;
import static androidx.test.espresso.matcher.ViewMatchers.hasDescendant;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static androidx.test.espresso.matcher.ViewMatchers.withEffectiveVisibility;
import static androidx.test.espresso.matcher.ViewMatchers.withId;
import static androidx.test.espresso.matcher.ViewMatchers.withText;

import static lk.sliit.solargrid.testing.TabActions.selectTab;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.junit.Assert.assertTrue;

import android.content.Context;

import androidx.test.core.app.ActivityScenario;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.espresso.matcher.ViewMatchers.Visibility;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.LargeTest;

import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.time.LocalDate;

import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.model.Roles;
import lk.sliit.solargrid.testing.AppUnderTest;
import lk.sliit.solargrid.testing.Samples;
import lk.sliit.solargrid.ui.operator.OperatorActivity;
import lk.sliit.solargrid.ui.prosumer.MainActivity;
import lk.sliit.solargrid.util.Times;
import okhttp3.mockwebserver.RecordedRequest;

@LargeTest
@RunWith(AndroidJUnit4.class)
public class BookingFlowTest {

    private static final String BOOKING_PATH = "/api/reservations/" + Samples.BOOKING_ID;

    @Rule
    public AppUnderTest app = new AppUnderTest();

    private final Context context = ApplicationProvider.getApplicationContext();

    /** A prosumer books a free slot in four steps and lands on the summary. */
    @Test
    public void booksASlotAndSeesTheSummary() throws InterruptedException {
        app.signIn(Roles.PROSUMER);
        answerTheMalabeStation();
        app.api.willAnswerPath("/api/reservations", 201, Samples.booking("Pending", 30));

        ActivityScenario.launch(BookingWizardActivity.forNewBooking(context, "st-mal"));
        onView(withText("08:00 - 10:00 · 3 of 5 bays free")).perform(scrollTo(), click());
        onView(withId(R.id.wizard_next)).perform(click());
        onView(withId(R.id.wizard_trade_export)).perform(click());
        onView(withId(R.id.wizard_energy)).perform(scrollTo(), replaceText("12.5"), closeSoftKeyboard());
        onView(withId(R.id.wizard_next)).perform(click());

        onView(allOf(withId(R.id.review_energy_row), hasDescendant(withText("12.5 kWh")))).check(matches(isDisplayed()));
        onView(withId(R.id.wizard_next)).check(matches(withText(R.string.wizard_book))).perform(click());

        onView(withId(R.id.result_title)).check(matches(withText(R.string.result_created_title)));
        onView(withId(R.id.result_message)).check(matches(withText(containsString("RSV-260918-HURV8"))));
        RecordedRequest sent = requestTo("POST", "/api/reservations");
        String body = sent.getBody().readUtf8();
        assertTrue(body, body.contains("\"slotId\":\"sl-1\""));
        assertTrue(body, body.contains("\"energyKwh\":12.5"));
        assertTrue(body, body.contains("\"tradeType\":\"Export\""));
    }

    /** More energy than one bay holds is marked before anything is sent. */
    @Test
    public void marksTooMuchEnergy() {
        app.signIn(Roles.PROSUMER);
        answerTheMalabeStation();

        ActivityScenario.launch(BookingWizardActivity.forNewBooking(context, "st-mal"));
        onView(withText("08:00 - 10:00 · 3 of 5 bays free")).perform(scrollTo(), click());
        onView(withId(R.id.wizard_next)).perform(click());
        onView(withId(R.id.wizard_trade_import)).perform(click());
        onView(withId(R.id.wizard_energy)).perform(scrollTo(), replaceText("80"), closeSoftKeyboard());
        onView(withId(R.id.wizard_next)).perform(click());

        onView(withText("At most 50 kWh fits in one battery bay at this station.")).check(matches(isDisplayed()));
        onView(withId(R.id.wizard_step_energy)).check(matches(isDisplayed()));
    }

    /** When the slot fills up first, the API's message is shown and the slots come back. */
    @Test
    public void showsTheApiRefusalAndGoesBackToTheSlots() {
        app.signIn(Roles.PROSUMER);
        answerTheMalabeStation();
        app.api.willFail(409, Samples.problem("Conflict", 409, "This slot is fully booked. Please choose another slot."));

        ActivityScenario.launch(BookingWizardActivity.forNewBooking(context, "st-mal"));
        onView(withText("08:00 - 10:00 · 3 of 5 bays free")).perform(scrollTo(), click());
        onView(withId(R.id.wizard_next)).perform(click());
        onView(withId(R.id.wizard_trade_export)).perform(click());
        onView(withId(R.id.wizard_energy)).perform(scrollTo(), replaceText("10"), closeSoftKeyboard());
        onView(withId(R.id.wizard_next)).perform(click());
        onView(withId(R.id.wizard_next)).perform(click());

        onView(withId(R.id.wizard_notice)).check(matches(withText("This slot is fully booked. Please choose another slot.")));
        onView(withId(R.id.wizard_step_slot)).check(matches(isDisplayed()));
    }

    /** A change keeps the booking's own slot and ends on the summary. */
    @Test
    public void changesABookingAndSeesTheSummary() throws InterruptedException {
        app.signIn(Roles.PROSUMER);
        String booking = Samples.booking("Pending", 30);
        app.api.willAnswerPath(BOOKING_PATH, 200, booking);
        answerTheMalabeStation();

        ActivityScenario.launch(BookingWizardActivity.forChange(context, Samples.BOOKING_ID));
        onView(withText(containsString("your booking"))).perform(scrollTo()).check(matches(isDisplayed()));
        onView(withId(R.id.wizard_next)).perform(click());
        onView(withId(R.id.wizard_energy)).check(matches(withText("12.5")));
        onView(withId(R.id.wizard_energy)).perform(scrollTo(), replaceText("20"), closeSoftKeyboard());
        onView(withId(R.id.wizard_next)).perform(click());
        onView(withId(R.id.wizard_next)).check(matches(withText(R.string.wizard_save))).perform(click());

        onView(withId(R.id.result_title)).check(matches(withText(R.string.result_changed_title)));
        RecordedRequest sent = requestTo("PUT", BOOKING_PATH);
        String body = sent.getBody().readUtf8();
        assertTrue(body, body.contains("\"slotId\":\"sl-" + Samples.BOOKING_ID + "\""));
        assertTrue(body, body.contains("\"energyKwh\":20"));
    }

    /** An approved booking shows its QR code, and can still be changed or cancelled. */
    @Test
    public void showsTheQrCodeOfAnApprovedBooking() {
        app.signIn(Roles.PROSUMER);
        app.api.willAnswerPath(BOOKING_PATH + "/qr", 200, Samples.qrCode());
        app.api.willAnswerPath(BOOKING_PATH, 200, Samples.booking("Approved", 30));

        ActivityScenario.launch(BookingDetailsActivity.intentFor(context, Samples.BOOKING_ID));

        onView(withId(R.id.details_reference)).check(matches(withText("RSV-260918-HURV8")));
        onView(withId(R.id.details_status)).check(matches(withText(R.string.status_approved)));
        onView(withId(R.id.details_qr)).perform(scrollTo()).check(matches(isDisplayed()));
        onView(withId(R.id.details_qr_text)).check(matches(withText(Samples.QR_PAYLOAD)));
        onView(withId(R.id.details_change)).perform(scrollTo()).check(matches(isDisplayed()));
        onView(withId(R.id.details_cancel)).perform(scrollTo()).check(matches(isDisplayed()));
    }

    /** Inside 12 hours of the start the buttons are gone and the rule is explained. */
    @Test
    public void hidesChangesInsideTwelveHours() {
        app.signIn(Roles.PROSUMER);
        app.api.willAnswerPath(BOOKING_PATH + "/qr", 200, Samples.qrCode());
        app.api.willAnswerPath(BOOKING_PATH, 200, Samples.booking("Approved", 5));

        ActivityScenario.launch(BookingDetailsActivity.intentFor(context, Samples.BOOKING_ID));

        onView(withId(R.id.details_change_window)).perform(scrollTo())
                .check(matches(withText(R.string.booking_change_closed)));
        onView(withId(R.id.details_change)).check(matches(withEffectiveVisibility(Visibility.GONE)));
        onView(withId(R.id.details_cancel)).check(matches(withEffectiveVisibility(Visibility.GONE)));
    }

    /** Cancelling asks for a reason, sends it, and ends on the summary. */
    @Test
    public void cancelsWithAReasonAndSeesTheSummary() throws InterruptedException {
        app.signIn(Roles.PROSUMER);
        app.api.willAnswerPath(BOOKING_PATH + "/cancel", 200, Samples.booking("Cancelled", 30));
        app.api.willAnswerPath(BOOKING_PATH + "/qr", 200, Samples.qrCode());
        app.api.willAnswerPath(BOOKING_PATH, 200, Samples.booking("Approved", 30));

        ActivityScenario.launch(BookingDetailsActivity.intentFor(context, Samples.BOOKING_ID));
        onView(withId(R.id.details_cancel)).perform(scrollTo(), click());
        onView(withId(R.id.reason)).inRoot(isDialog()).perform(replaceText("Plans changed"), closeSoftKeyboard());
        onView(withId(android.R.id.button1)).inRoot(isDialog()).perform(click());

        onView(withId(R.id.result_title)).check(matches(withText(R.string.result_cancelled_title)));
        onView(withId(R.id.result_status)).check(matches(withText(R.string.status_cancelled)));
        RecordedRequest sent = requestTo("POST", BOOKING_PATH + "/cancel");
        assertTrue(sent.getBody().readUtf8().contains("\"reason\":\"Plans changed\""));
    }

    /** The Bookings tab asks for the chosen list, the search text and the status filter. */
    @Test
    public void sendsTheTabsSearchAndFiltersToTheApi() throws InterruptedException {
        app.signIn(Roles.PROSUMER);
        app.api.willAnswerPath("/api/dashboard", 200, Samples.emptyDashboard());
        app.api.willAnswerPath("/api/reservations", 200,
                Samples.bookingPage(1, 1, 1, Samples.booking("Pending", 30)));

        ActivityScenario.launch(MainActivity.class);
        onView(withId(R.id.tab_bookings)).perform(click());
        onView(withId(R.id.bookings_tabs)).perform(selectTab(1));
        onView(withText("SLIIT Malabe Campus Microgrid")).check(matches(isDisplayed()));
        onView(withId(R.id.bookings_search)).perform(replaceText("RSV-2609"), pressImeActionButton());
        onView(withId(R.id.bookings_filter_status)).perform(click());
        onView(withText(R.string.status_pending)).inRoot(isDialog()).perform(click());

        onView(withId(R.id.bookings_filter_status)).check(matches(withText("Status: Pending")));
        onView(withId(R.id.bookings_filter_clear)).perform(scrollTo()).check(matches(isDisplayed()));
        requestContaining("scope=Pending");
        requestContaining("search=RSV-2609");
        requestContaining("status=Pending");
    }

    /** An operator finds a booking of the day and cancels it for the prosumer. */
    @Test
    public void operatorCancelsForAProsumer() throws InterruptedException {
        app.signIn(Roles.GRID_OPERATOR);
        app.api.willAnswerPath("/api/dashboard/summary", 200, Samples.staffDashboard());
        app.api.willAnswerPath(BOOKING_PATH + "/cancel", 200, Samples.booking("Cancelled", 30));
        app.api.willAnswerPath(BOOKING_PATH, 200, Samples.booking("Approved", 30));
        app.api.willAnswerPath("/api/reservations", 200,
                Samples.bookingPage(1, 1, 1, Samples.booking("Approved", 30)));

        ActivityScenario.launch(OperatorActivity.class);
        onView(withId(R.id.tab_today)).perform(click());
        onView(withId(R.id.today_count_pending)).check(matches(withText("4")));
        onView(withId(R.id.today_count_approved)).check(matches(withText("9")));
        onView(withText("RSV-260918-HURV8 · 12.5 kWh · Export · Kasun Perera")).perform(click());

        onView(withId(R.id.details_prosumer_row)).perform(scrollTo()).check(matches(isDisplayed()));
        onView(withId(R.id.details_qr_card)).check(matches(withEffectiveVisibility(Visibility.GONE)));
        onView(withId(R.id.details_change)).check(matches(withEffectiveVisibility(Visibility.GONE)));
        onView(withId(R.id.details_cancel)).perform(scrollTo())
                .check(matches(withText(R.string.booking_cancel_for_prosumer)))
                .perform(click());
        onView(withId(android.R.id.button1)).inRoot(isDialog()).perform(click());

        onView(withId(R.id.result_message))
                .check(matches(withText("RSV-260918-HURV8 for Kasun Perera is cancelled and its bay is free again.")));
        onView(withId(R.id.result_list)).perform(scrollTo(), click());
        onView(withId(R.id.today_list)).check(matches(isDisplayed()));
        requestContaining("from=" + Times.isoDay(LocalDate.now(Times.ZONE)));
    }

    /** The Malabe station and two free slots, whatever day is asked for. */
    private void answerTheMalabeStation() {
        app.api.willAnswerPath("/api/stations/st-mal/slots", 200, Samples.freeSlots(Times.today()));
        app.api.willAnswerPath("/api/stations/st-mal", 200, Samples.malabeStation(9));
    }

    /** The first request with this method and address; the requests before it are skipped. */
    private RecordedRequest requestTo(String method, String path) throws InterruptedException {
        for (int i = 0; i < 20; i++) {
            RecordedRequest request = app.api.requestSent();
            if (method.equals(request.getMethod()) && path.equals(request.getPath())) {
                return request;
            }
        }
        throw new AssertionError("The app never sent " + method + " " + path);
    }

    /** Waits for a request whose address contains the text. */
    private void requestContaining(String part) throws InterruptedException {
        for (int i = 0; i < 20; i++) {
            String path = app.api.requestSent().getPath();
            if (path != null && path.contains(part)) {
                return;
            }
        }
        throw new AssertionError("No request contained " + part);
    }
}
