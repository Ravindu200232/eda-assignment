/*
 * File:    AuthRepositoryTest.java
 * Module:  Tests
 * Owner:   Ravindu
 * Purpose: Checks signing in against a stand-in server: the token is kept, a
 *          refused login shows the message of the API, validation messages
 *          reach the form boxes, and a token the API refuses ends the session.
 * Source:  AND-13 (Robolectric), AND-14 (MockWebServer).
 */
package lk.sliit.solargrid.data.repo;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;

import java.io.IOException;
import java.util.concurrent.atomic.AtomicReference;

import lk.sliit.solargrid.AppContainer;
import lk.sliit.solargrid.data.model.Roles;
import lk.sliit.solargrid.data.model.Session;
import lk.sliit.solargrid.data.remote.ApiCallback;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.data.remote.dto.UserDto;
import lk.sliit.solargrid.session.SessionStore;
import lk.sliit.solargrid.testing.FakeApi;
import lk.sliit.solargrid.testing.Samples;
import lk.sliit.solargrid.testing.TestWait;
import okhttp3.mockwebserver.RecordedRequest;

@RunWith(RobolectricTestRunner.class)
public class AuthRepositoryTest {

    private final FakeApi api = new FakeApi();
    private final AtomicReference<Session> signedIn = new AtomicReference<>();
    private final AtomicReference<ApiError> failure = new AtomicReference<>();

    /** Starts the stand-in server and points the app at it. */
    @Before
    public void setUp() throws IOException {
        api.start();
        sessions().clear();
    }

    /** Stops the stand-in server. */
    @After
    public void tearDown() throws IOException {
        api.stop();
    }

    /** A good login keeps the token, so the next screen can use it. */
    @Test
    public void keepsTheSessionAfterALogin() {
        api.willAnswer(200, Samples.login(Roles.PROSUMER));

        login("kasun@example.com", "Prosumer@123");

        TestWait.until(() -> signedIn.get() != null || failure.get() != null);
        assertNotNull("The login did not finish: " + failure.get(), signedIn.get());
        assertEquals(Roles.PROSUMER, signedIn.get().user.role);
        assertTrue(sessions().isSignedIn());
        assertEquals("test-token", sessions().token());
    }

    /** The details typed by the user are sent to the login endpoint. */
    @Test
    public void sendsTheTypedDetails() throws InterruptedException {
        api.willAnswer(200, Samples.login(Roles.GRID_OPERATOR));

        login("operator@solargrid.lk", "Operator@123");
        TestWait.until(() -> signedIn.get() != null || failure.get() != null);

        RecordedRequest request = api.requestSent();
        assertEquals("POST", request.getMethod());
        assertEquals("/api/auth/login", request.getPath());
        String body = request.getBody().readUtf8();
        assertTrue(body, body.contains("operator@solargrid.lk"));
    }

    /** A refused login shows the words of the API and signs nobody in. */
    @Test
    public void showsWhyALoginWasRefused() {
        api.willFail(403, Samples.problem("Account not active", 403,
                "Your account is waiting for Backoffice activation."));

        login("kasun@example.com", "Prosumer@123");

        TestWait.until(() -> failure.get() != null);
        assertEquals("Your account is waiting for Backoffice activation.", failure.get().message);
        assertFalse(sessions().isSignedIn());
    }

    /** Validation messages come back on the name of the box that needs fixing. */
    @Test
    public void marksTheBoxThatNeedsFixing() {
        api.willFail(400, "{\"title\":\"One or more validation errors occurred.\",\"status\":400,"
                + "\"errors\":{\"Password\":[\"Enter your password.\"]}}");

        login("kasun@example.com", "");

        TestWait.until(() -> failure.get() != null);
        assertEquals("Enter your password.", failure.get().fieldError("password"));
    }

    /** When the API refuses the token, the saved login is thrown away. */
    @Test
    public void endsTheSessionWhenTheTokenIsRefused() {
        api.willAnswer(200, Samples.login(Roles.PROSUMER));
        login("kasun@example.com", "Prosumer@123");
        TestWait.until(() -> signedIn.get() != null);

        api.willAnswerEmpty(401);
        AtomicReference<ApiError> refreshFailure = new AtomicReference<>();
        AppContainer.get().auth().refreshUser(new ApiCallback<UserDto>() {

            /** Not expected in this test. */
            @Override
            public void onSuccess(UserDto user) {
            }

            /** The refused token arrives here. */
            @Override
            public void onError(ApiError error) {
                refreshFailure.set(error);
            }
        });

        TestWait.until(() -> refreshFailure.get() != null);
        assertTrue(refreshFailure.get().isSessionEnded());
        TestWait.until(() -> !sessions().isSignedIn());
        assertEquals(ApiError.SESSION_ENDED, sessions().takeEndedReason());
    }

    /** Signs in and keeps whichever answer comes back. */
    private void login(String username, String password) {
        signedIn.set(null);
        failure.set(null);
        AppContainer.get().auth().login(username, password, new ApiCallback<Session>() {

            /** The login worked. */
            @Override
            public void onSuccess(Session session) {
                signedIn.set(session);
            }

            /** The login failed. */
            @Override
            public void onError(ApiError error) {
                failure.set(error);
            }
        });
    }

    /** The place where the app keeps the signed-in user. */
    private static SessionStore sessions() {
        return AppContainer.get().session();
    }
}
