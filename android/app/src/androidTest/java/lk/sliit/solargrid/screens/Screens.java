/*
 * File:    Screens.java
 * Module:  Tests
 * Owner:   Ravindu
 * Purpose: Marks the test that walks the app and saves a picture of each
 *          screen for the report. The everyday test run leaves it out; the
 *          script android/scripts/take-screenshots.ps1 runs only this.
 */
package lk.sliit.solargrid.screens;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD, ElementType.TYPE})
public @interface Screens {
}
