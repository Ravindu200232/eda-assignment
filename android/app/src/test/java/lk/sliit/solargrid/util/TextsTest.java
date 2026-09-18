/*
 * File:    TextsTest.java
 * Module:  Tests
 * Owner:   Ravindu
 * Purpose: Checks the small helpers that write energy amounts, empty values
 *          and the letters on the account picture.
 */
package lk.sliit.solargrid.util;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class TextsTest {

    /** Whole numbers are written without decimals. */
    @Test
    public void writesWholeNumbersPlainly() {
        assertEquals("12 kWh", Texts.kwh(12.0));
    }

    /** One decimal is kept when it means something. */
    @Test
    public void keepsAUsefulDecimal() {
        assertEquals("12.5 kWh", Texts.kwh(12.5));
        assertEquals("12.25 kWh", Texts.kwh(12.25));
    }

    /** A missing amount is shown as a dash, not as "null". */
    @Test
    public void showsADashWhenThereIsNoAmount() {
        assertEquals("-", Texts.kwh(null));
        assertEquals("-", Texts.orDash("   "));
    }

    /** Empty text is spotted even when it is only spaces. */
    @Test
    public void spotsEmptyText() {
        assertTrue(Texts.isBlank(null));
        assertTrue(Texts.isBlank("  "));
        assertFalse(Texts.isBlank("Kasun"));
    }

    /** The account picture shows at most two letters. */
    @Test
    public void takesTwoLettersFromTheName() {
        assertEquals("KP", Texts.initials("Kasun Perera"));
        assertEquals("N", Texts.initials("Nimal"));
        assertEquals("?", Texts.initials(null));
    }
}
