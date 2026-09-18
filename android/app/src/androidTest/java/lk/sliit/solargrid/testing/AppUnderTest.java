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
import lk.sliit.solargrid.data.model.Roles;
import lk.sliit.solargrid.data.remote.dto.UserDto;
import lk.sliit.solargrid.util.LocationFinder;

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
                    AppContainer.get().useLocationFinder(new LocationFinder.Fused());
                    api.stop();
                    IdlingRegistry.getInstance().unregister(idling);
                }
            }
        };
    }

    /**
     * Signs somebody in without going through the login screen. A prosumer is
     * Kasun Perera, who owns the sample bookings; staff have a NIC of their
     * own, so a booking's history tells them "by the prosumer" (Hamnad).
     */
    public void signIn(String role) {
        boolean prosumer = Roles.isProsumer(role);
        UserDto user = new UserDto();
        user.nic = prosumer ? Samples.MY_NIC : "198800001111";
        user.fullName = prosumer ? "Kasun Perera" : "Nimal Silva";
        user.email = prosumer ? "kasun@example.com" : "operator@solargrid.lk";
        user.phone = prosumer ? "0771234567" : "0777654321";
        user.role = role;
        user.status = "Active";
        AppContainer.get().session().save("test-token", "2099-09-18T14:30:00Z", user);
    }
}
