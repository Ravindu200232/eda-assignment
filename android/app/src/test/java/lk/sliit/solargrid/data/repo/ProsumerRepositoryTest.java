/*
 * File:    ProsumerRepositoryTest.java
 * Module:  Tests
 * Owner:   Malith
 * Purpose: Checks the prosumer account calls against a stand-in server:
 *          sign-up, reading and saving the profile (and its offline copy),
 *          changing the password and closing the account.
 * Source:  AND-13 (Robolectric), AND-14 (MockWebServer).
 */
package lk.sliit.solargrid.data.repo;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;

import java.io.IOException;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import lk.sliit.solargrid.AppContainer;
import lk.sliit.solargrid.data.model.Roles;
import lk.sliit.solargrid.data.remote.ApiCallback;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.data.remote.dto.RegisterProsumerRequest;
import lk.sliit.solargrid.data.remote.dto.UpdateProsumerRequest;
import lk.sliit.solargrid.data.remote.dto.UserDto;
import lk.sliit.solargrid.testing.FakeApi;
import lk.sliit.solargrid.testing.Samples;
import lk.sliit.solargrid.testing.TestWait;
import okhttp3.mockwebserver.RecordedRequest;

@RunWith(RobolectricTestRunner.class)
public class ProsumerRepositoryTest {

    private final FakeApi api = new FakeApi();
    private final AtomicReference<UserDto> answer = new AtomicReference<>();
    private final AtomicReference<ApiError> failure = new AtomicReference<>();
    private final AtomicBoolean finished = new AtomicBoolean(false);

    /** Starts the stand-in server and signs a prosumer in. */
    @Before
    public void setUp() throws IOException {
        api.start();
        UserDto user = new UserDto();
        user.nic = "200034501234";
        user.fullName = "Kasun Perera";
        user.role = Roles.PROSUMER;
        user.status = "Active";
        AppContainer.get().session().save("test-token", "2099-09-18T14:30:00Z", user);
    }

    /** Stops the stand-in server. */
    @After
    public void tearDown() throws IOException {
        api.stop();
    }

    /** A sign-up sends every box to the register endpoint. */
    @Test
    public void signsUpWithEveryDetail() throws InterruptedException {
        api.willAnswer(201, Samples.profile("0712345678", "Pending"));

        RegisterProsumerRequest request = new RegisterProsumerRequest();
        request.nic = "200034501234";
        request.fullName = "Kasun Perera";
        request.email = "kasun@example.com";
        request.phone = "0712345678";
        request.password = "Prosumer@123";
        request.address = "No. 12, Temple Road, Malabe";
        request.solarCapacityKw = 5.5;
        repository().register(request, userCallback());

        TestWait.until(finished::get);
        assertNotNull("The sign-up failed: " + failure.get(), answer.get());
        assertEquals("Pending", answer.get().status);

        RecordedRequest sent = api.requestSent();
        assertEquals("/api/prosumers/register", sent.getPath());
        String body = sent.getBody().readUtf8();
        assertTrue(body, body.contains("\"nic\":\"200034501234\""));
        assertTrue(body, body.contains("\"solarCapacityKw\":5.5"));
    }

    /** A NIC the API does not accept comes back on the NIC box. */
    @Test
    public void marksABadNic() {
        api.willFail(400, Samples.fieldProblem("Nic", "NIC must look like 123456789V or 200012345678."));

        repository().register(new RegisterProsumerRequest(), userCallback());

        TestWait.until(finished::get);
        assertEquals("NIC must look like 123456789V or 200012345678.", failure.get().fieldError("nic"));
    }

    /** The newest profile is kept on the phone and renames the session user. */
    @Test
    public void keepsTheProfileForOfflineUse() {
        api.willAnswer(200, Samples.profile("0779998887", "Active"));

        repository().refreshProfile(userCallback());

        TestWait.until(finished::get);
        assertEquals("0779998887", AppContainer.get().session().user().phone);

        AtomicReference<UserDto> saved = new AtomicReference<>();
        AtomicBoolean read = new AtomicBoolean(false);
        TestWait.until(() -> {
            if (!read.get()) {
                read.set(true);
                repository().savedProfile(profile -> saved.set(profile));
            }
            return saved.get() != null;
        });
        assertEquals("0779998887", saved.get().phone);
    }

    /** Saving sends the whole profile with PUT, because the API replaces it. */
    @Test
    public void sendsTheWholeProfile() throws InterruptedException {
        api.willAnswer(200, Samples.profile("0779998887", "Active"));

        UpdateProsumerRequest request = new UpdateProsumerRequest();
        request.fullName = "Kasun Perera";
        request.email = "kasun@example.com";
        request.phone = "0779998887";
        request.address = "No. 12, Temple Road, Malabe";
        request.meterNumber = "CEB-MLB-10021";
        request.solarCapacityKw = 5.5;
        repository().updateProfile(request, userCallback());

        TestWait.until(finished::get);
        RecordedRequest sent = api.requestSent();
        assertEquals("PUT", sent.getMethod());
        assertEquals("/api/prosumers/me", sent.getPath());
        String body = sent.getBody().readUtf8();
        assertTrue(body, body.contains("\"address\":\"No. 12, Temple Road, Malabe\""));
        assertTrue(body, body.contains("\"meterNumber\":\"CEB-MLB-10021\""));
    }

    /** Closing the account signs the prosumer out. */
    @Test
    public void deactivationSignsTheProsumerOut() {
        api.willAnswerEmpty(204);

        repository().deactivate("Prosumer@123", voidCallback());

        TestWait.until(finished::get);
        assertNull(failure.get());
        assertFalse(AppContainer.get().session().isSignedIn());
    }

    /** A wrong password keeps the account and shows the API message. */
    @Test
    public void wrongPasswordKeepsTheAccount() {
        api.willFail(400, Samples.problem("Business rule", 400, "Password is incorrect."));

        repository().deactivate("wrong", voidCallback());

        TestWait.until(finished::get);
        assertEquals("Password is incorrect.", failure.get().message);
        assertTrue(AppContainer.get().session().isSignedIn());
    }

    /** A password change reaches the auth endpoint with both passwords. */
    @Test
    public void changesThePassword() throws InterruptedException {
        api.willAnswerEmpty(204);

        AppContainer.get().auth().changePassword("Prosumer@123", "Solar2026", voidCallback());

        TestWait.until(finished::get);
        assertNull(failure.get());
        RecordedRequest sent = api.requestSent();
        assertEquals("/api/auth/change-password", sent.getPath());
        assertTrue(sent.getBody().readUtf8().contains("\"newPassword\":\"Solar2026\""));
    }

    /** The repository of the running app, which points at the stand-in server. */
    private static ProsumerRepository repository() {
        return AppContainer.get().prosumers();
    }

    /** Keeps whichever answer comes back for a profile call. */
    private ApiCallback<UserDto> userCallback() {
        return new ApiCallback<UserDto>() {

            /** The call worked. */
            @Override
            public void onSuccess(UserDto result) {
                answer.set(result);
                finished.set(true);
            }

            /** The call failed. */
            @Override
            public void onError(ApiError error) {
                failure.set(error);
                finished.set(true);
            }
        };
    }

    /** Keeps whichever answer comes back for a call with no body. */
    private ApiCallback<Void> voidCallback() {
        return new ApiCallback<Void>() {

            /** The call worked. */
            @Override
            public void onSuccess(Void result) {
                finished.set(true);
            }

            /** The call failed. */
            @Override
            public void onError(ApiError error) {
                failure.set(error);
                finished.set(true);
            }
        };
    }
}
