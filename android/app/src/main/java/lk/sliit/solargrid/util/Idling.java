/*
 * File:    Idling.java
 * Module:  Core
 * Owner:   Ravindu
 * Purpose: Counts the requests that are still running. The app does not use
 *          the number itself; the instrumented tests read it so they wait for
 *          the network instead of sleeping for a fixed time.
 * Source:  AND-16 (Espresso idling resources).
 */
package lk.sliit.solargrid.util;

import java.util.concurrent.atomic.AtomicInteger;

public final class Idling {

    private static final AtomicInteger running = new AtomicInteger(0);

    /** Nobody builds this class; it only holds the counter. */
    private Idling() {
    }

    /** Called when a request starts. */
    public static void begin() {
        running.incrementAndGet();
    }

    /** Called when a request finishes, whether it worked or not. */
    public static void end() {
        running.decrementAndGet();
    }

    /** True when nothing is waiting for the server. */
    public static boolean isIdle() {
        return running.get() <= 0;
    }
}
