/*
 * File:    RoleText.java
 * Module:  Shared screens
 * Owner:   Ravindu
 * Purpose: Turns the role word the API sends into the words people use.
 *          "GridOperator" reads badly on a screen, so it becomes
 *          "Grid Operator".
 */
package lk.sliit.solargrid.ui.common;

import android.content.Context;

import androidx.annotation.Nullable;

import lk.sliit.solargrid.R;
import lk.sliit.solargrid.data.model.Roles;

public final class RoleText {

    /** Nobody builds this class; it only translates one word. */
    private RoleText() {
    }

    /** The role as it should be shown, or a dash when it is missing. */
    public static String of(Context context, @Nullable String role) {
        if (Roles.isProsumer(role)) {
            return context.getString(R.string.role_prosumer);
        }
        if (Roles.isOperator(role)) {
            return context.getString(R.string.role_operator);
        }
        if (Roles.isBackoffice(role)) {
            return context.getString(R.string.role_backoffice);
        }
        return role == null ? "-" : role;
    }
}
