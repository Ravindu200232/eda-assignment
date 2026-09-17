/*
 * File:    AppUnderTest.java
 * Module:  Tests
 * Owner:   Ravindu
 * Purpose: Prepares the app before each emulator test: a stand-in API server
 *          instead of the real one, nobody signed in, and Espresso told how to
 *          wait for requests. Everything is put back afterwards.
 * Source:  AND-15 (Espresso), AND-14 (MockWebServer).
 */
package lk.sliit.solargrid.testing;

import androidx.test.espresso.IdlingRegistry;

import org.junit.rules.TestRule;
import org.junit.runner.Description;
import org.junit.runners.model.Statement;

import lk.sliit.solargrid.AppContainer;
import lk.sliit.solargrid.data.remote.dto.UserDto;

public class AppUnderTest implements TestRule {

    /** The stand-in server the test fills with answers. */
    public final FakeApi api = new FakeApi();

    private final ApiIdlingResource idling = new ApiIdlingResource();

    /** Runs one test with a clean app and a stand-in server. */
    @Override
    public Statement apply(Statement test, Description description) {
        return new Statement() {

            /** Sets everything up, runs the test, then cleans up. */
            @Override
            public void evaluate() throws Throwable {
                IdlingRegistry.getInstance().register(idling);
                api.start();
                AppContainer.get().session().clear();
                try {
                    test.evaluate();
                } finally {
                    AppContainer.get().session().clear();
                    api.stop();
                    IdlingRegistry.getInstance().unregister(idling);
                }
            }
        };
    }

    /** Signs somebody in without going through the login screen. */
    public void signIn(String role) {
        UserDto user = new UserDto();
        user.nic = "199512345678";
        user.fullName = "Nimal Silva";
        user.email = "operator@solargrid.lk";
        user.phone = "0777654321";
        user.role = role;
        user.status = "Active";
        AppContainer.get().session().save("test-token", "2099-09-18T14:30:00Z", user);
    }
}
