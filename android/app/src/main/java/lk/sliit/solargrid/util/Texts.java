/*
 * File:    Texts.java
 * Module:  Core
 * Owner:   Ravindu
 * Purpose: Small helpers for the words and numbers shown on screen, so every
 *          screen writes energy amounts and empty values the same way.
 */
package lk.sliit.solargrid.util;

import androidx.annotation.Nullable;

import java.util.Locale;

public final class Texts {

    /** Nobody builds this class; it is only a set of helpers. */
    private Texts() {
    }

    /** True when the text is missing or only spaces. */
    public static boolean isBlank(@Nullable String text) {
        return text == null || text.trim().isEmpty();
    }

    /** The text, or a dash when there is nothing to show. */
    public static String orDash(@Nullable String text) {
        return isBlank(text) ? "-" : text.trim();
    }

    /** "12.5 kWh" - energy amounts, without decimals that mean nothing. */
    public static String kwh(@Nullable Double amount) {
        if (amount == null) {
            return "-";
        }
        return number(amount) + " kWh";
    }

    /** A number with at most two decimals, for example 12, 12.5 or 12.25. */
    public static String number(double value) {
        if (value == Math.rint(value) && !Double.isInfinite(value)) {
            return String.format(Locale.UK, "%.0f", value);
        }
        String text = String.format(Locale.UK, "%.2f", value);
        return text.endsWith("0") ? text.substring(0, text.length() - 1) : text;
    }

    /** The first letters of a name, for the round picture on the account page. */
    public static String initials(@Nullable String fullName) {
        if (isBlank(fullName)) {
            return "?";
        }
        String[] parts = fullName.trim().split("\\s+");
        StringBuilder letters = new StringBuilder();
        for (String part : parts) {
            if (letters.length() < 2 && !part.isEmpty()) {
                letters.append(Character.toUpperCase(part.charAt(0)));
            }
        }
        return letters.toString();
    }
}
