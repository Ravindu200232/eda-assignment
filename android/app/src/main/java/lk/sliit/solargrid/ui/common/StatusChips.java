/*
 * File:    StatusChips.java
 * Module:  Shared screens
 * Owner:   Ravindu
 * Purpose: Paints the small status pill that every booking list and details
 *          screen shows, so "Approved" looks the same in the whole app. A
 *          booking that was approved but whose time has passed is shown as
 *          "Missed", which is what the web portal does as well.
 */
package lk.sliit.solargrid.ui.common;

import android.content.res.ColorStateList;
import android.widget.TextView;

import androidx.core.content.ContextCompat;

import lk.sliit.solargrid.R;

public final class StatusChips {

    /** Nobody builds this class; it only paints a chip. */
    private StatusChips() {
    }

    /**
     * Writes the status into the chip and gives it the matching colours. A
     * waiting or approved booking whose slot is over was missed, as in the
     * web portal (Hamnad added the waiting case with the booking screens).
     */
    public static void apply(TextView chip, String status, boolean isPast) {
        int label;
        int background;
        int text;

        if (("Approved".equals(status) || "Pending".equals(status)) && isPast) {
            label = R.string.status_missed;
            background = R.color.chip_warning_bg;
            text = R.color.chip_warning_text;
        } else if ("Approved".equals(status)) {
            label = R.string.status_approved;
            background = R.color.chip_success_bg;
            text = R.color.chip_success_text;
        } else if ("Pending".equals(status)) {
            label = R.string.status_pending;
            background = R.color.chip_warning_bg;
            text = R.color.chip_warning_text;
        } else if ("Completed".equals(status)) {
            label = R.string.status_completed;
            background = R.color.chip_info_bg;
            text = R.color.chip_info_text;
        } else if ("Cancelled".equals(status)) {
            label = R.string.status_cancelled;
            background = R.color.chip_neutral_bg;
            text = R.color.chip_neutral_text;
        } else if ("Rejected".equals(status)) {
            label = R.string.status_rejected;
            background = R.color.chip_danger_bg;
            text = R.color.chip_danger_text;
        } else {
            // An unknown word from a newer API version is still shown as it came.
            chip.setText(status);
            paint(chip, R.color.chip_neutral_bg, R.color.chip_neutral_text);
            return;
        }

        chip.setText(label);
        paint(chip, background, text);
    }

    /** Paints the chip for an account status (added by Malith for the profile). */
    public static void applyAccount(TextView chip, String status) {
        if ("Active".equals(status)) {
            chip.setText(R.string.account_status_active);
            paint(chip, R.color.chip_success_bg, R.color.chip_success_text);
        } else if ("Pending".equals(status)) {
            chip.setText(R.string.account_status_pending);
            paint(chip, R.color.chip_warning_bg, R.color.chip_warning_text);
        } else if ("Deactivated".equals(status)) {
            chip.setText(R.string.account_status_deactivated);
            paint(chip, R.color.chip_neutral_bg, R.color.chip_neutral_text);
        } else {
            chip.setText(status);
            paint(chip, R.color.chip_neutral_bg, R.color.chip_neutral_text);
        }
    }

    /** Sets the two colours of the chip. */
    private static void paint(TextView chip, int backgroundColour, int textColour) {
        chip.setBackgroundTintList(ColorStateList.valueOf(
                ContextCompat.getColor(chip.getContext(), backgroundColour)));
        chip.setTextColor(ContextCompat.getColor(chip.getContext(), textColour));
    }
}
