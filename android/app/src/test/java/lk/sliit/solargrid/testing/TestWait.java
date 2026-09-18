/*
 * File:    TestWait.java
 * Module:  Tests
 * Owner:   Ravindu
 * Purpose: Lets a local test wait for an answer that comes back on the main
 *          thread. Requests run on a background thread and post their result
 *          to the main looper, so the test keeps running that looper until the
 *          result has arrived.
 * Source:  AND-13 (Robolectric loopers).
 */
package lk.sliit.solargrid.testing;

import org.robolectric.shadows.ShadowLooper;

public final class TestWait {

    /** How long a test waits before it gives up. */
    private static final long LIMIT_MILLIS = 10_000;

    /** Something the test is waiting for. */
    public interface Condition {

        /** True once the answer has arrived. */
        boolean isReady();
    }

    /** Nobody builds this class; it is only a helper. */
    private TestWait() {
    }

    /** Runs the main looper until the condition is true, or fails the test. */
    public static void until(Condition condition) {
        ShadowLooper main = ShadowLooper.shadowMainLooper();
        long deadline = System.currentTimeMillis() + LIMIT_MILLIS;

        while (System.currentTimeMillis() < deadline) {
            main.idle();
            if (condition.isReady()) {
                return;
            }
            try {
                Thread.sleep(10);
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        throw new AssertionError("The answer did not arrive in time.");
    }
}
