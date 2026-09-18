/*
 * File:    Forms.java
 * Module:  Shared screens
 * Owner:   Malith
 * Purpose: Small helpers for the forms of the app: read a box without the
 *          spaces around it, mark empty boxes, and put the messages the API
 *          sent for each field under the right box.
 */
package lk.sliit.solargrid.ui.common;

import androidx.annotation.Nullable;

import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;

import java.util.Map;

import lk.sliit.solargrid.data.remote.ApiError;

public final class Forms {

    /** Nobody builds this class; it is only a set of helpers. */
    private Forms() {
    }

    /** The text of a box, without the spaces around it. */
    public static String text(TextInputEditText box) {
        CharSequence value = box.getText();
        return value == null ? "" : value.toString().trim();
    }

    /** The text of a box, or null when it is empty (for optional fields). */
    @Nullable
    public static String textOrNull(TextInputEditText box) {
        String value = text(box);
        return value.isEmpty() ? null : value;
    }

    /**
     * A number typed in a box, or null when the box is empty. A comma is read
     * as a decimal point, because some keyboards offer only a comma.
     */
    @Nullable
    public static Double number(TextInputEditText box) {
        String value = text(box).replace(',', '.');
        if (value.isEmpty()) {
            return null;
        }
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException notANumber) {
            return Double.NaN;
        }
    }

    /** Marks the box when it is empty. Returns true when the box has text. */
    public static boolean required(TextInputLayout layout, TextInputEditText box, String message) {
        if (text(box).isEmpty()) {
            layout.setError(message);
            return false;
        }
        layout.setError(null);
        return true;
    }

    /** Clears the messages under all the given boxes. */
    public static void clearErrors(TextInputLayout... layouts) {
        for (TextInputLayout layout : layouts) {
            layout.setError(null);
        }
    }

    /**
     * Puts each field message from the API under its box. Returns true when at
     * least one box got a message, so the screen knows the form needs fixing.
     */
    public static boolean showFieldErrors(ApiError error, Map<String, TextInputLayout> boxes) {
        boolean shown = false;
        for (Map.Entry<String, TextInputLayout> box : boxes.entrySet()) {
            String message = error.fieldError(box.getKey());
            if (message != null) {
                box.getValue().setError(message);
                shown = true;
            }
        }
        return shown;
    }
}
