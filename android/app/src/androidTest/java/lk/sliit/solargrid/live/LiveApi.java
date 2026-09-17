/*
 * File:    LiveApi.java
 * Module:  Tests
 * Owner:   Ravindu
 * Purpose: Marks a test that talks to a real running Web API instead of the
 *          stand-in server. The everyday test run leaves these out; the script
 *          android/scripts/run-e2e.ps1 runs only these.
 */
package lk.sliit.solargrid.live;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD, ElementType.TYPE})
public @interface LiveApi {
}
