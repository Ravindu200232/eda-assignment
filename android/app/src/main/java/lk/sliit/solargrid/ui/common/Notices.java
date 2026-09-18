/*
 * File:    Notices.java
 * Module:  Shared screens
 * Owner:   Malith
 * Purpose: The message box that sits above a form button. The same box shows
 *          good news in green with a tick and a problem in pink with a warning
 *          sign, so every form in the app reports back the same way.
 */
package lk.sliit.solargrid.ui.common;

import android.content.res.ColorStateList;
import android.view.View;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.core.widget.TextViewCompat;

import lk.sliit.solargrid.R;

public final class Notices {

    /** Nobody builds this class; it is only a helper. */
    private Notices() {
    }

    /** Shows a problem, or hides the box when there is no message. */
    public static void problem(TextView box, @Nullable String message) {
        show(box, message, R.color.danger, R.drawable.ic_circle_alert);
    }

    /** Shows good news, for example "Your profile was saved." */
    public static void success(TextView box, String message) {
        show(box, message, R.color.success, R.drawable.ic_circle_check);
    }

    /** Hides the box. */
    public static void hide(TextView box) {
        box.setVisibility(View.GONE);
    }

    /** Writes the message in the given colour, with the matching icon. */
    private static void show(TextView box, @Nullable String message, int colour, int icon) {
        if (message == null || message.trim().isEmpty()) {
            hide(box);
            return;
        }
        int colourValue = ContextCompat.getColor(box.getContext(), colour);
        box.setText(message);
        box.setTextColor(colourValue);
        box.setCompoundDrawablesRelativeWithIntrinsicBounds(icon, 0, 0, 0);
        TextViewCompat.setCompoundDrawableTintList(box, ColorStateList.valueOf(colourValue));
        box.setVisibility(View.VISIBLE);
    }
}
