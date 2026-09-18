/*
 * File:    ApiIdlingResource.java
 * Module:  Tests
 * Owner:   Ravindu
 * Purpose: Tells Espresso when the app is waiting for the server, so a test
 *          carries on the moment an answer arrives instead of sleeping for a
 *          guessed number of seconds. It reads the counter the app keeps in
 *          util/Idling.
 * Source:  AND-16 (Espresso idling resources).
 */
package lk.sliit.solargrid.testing;

import androidx.test.espresso.IdlingResource;

import lk.sliit.solargrid.util.Idling;

public class ApiIdlingResource implements IdlingResource {

    private ResourceCallback callback;

    /** The name Espresso prints when a test times out. */
    @Override
    public String getName() {
        return "SolarGrid API calls";
    }

    /** True when no request is waiting for an answer. */
    @Override
    public boolean isIdleNow() {
        boolean idle = Idling.isIdle();
        if (idle && callback != null) {
            callback.onTransitionToIdle();
        }
        return idle;
    }

    /** Espresso gives us a way to say "the app is free again". */
    @Override
    public void registerIdleTransitionCallback(ResourceCallback callback) {
        this.callback = callback;
    }
}
