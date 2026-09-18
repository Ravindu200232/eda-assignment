/*
 * File:    PasswordRequests.java
 * Module:  Prosumer Accounts
 * Owner:   Malith
 * Purpose: The two small requests that carry a password: changing it
 *          (POST api/auth/change-password) and confirming a deactivation
 *          (POST api/prosumers/me/deactivate).
 */
package lk.sliit.solargrid.data.remote.dto;

public final class PasswordRequests {

    /** Nobody builds this class; it only groups the two requests. */
    private PasswordRequests() {
    }

    /** The current password and the new one. */
    public static class ChangePassword {

        public String currentPassword;
        public String newPassword;

        /** Holds the two passwords from the form. */
        public ChangePassword(String currentPassword, String newPassword) {
            this.currentPassword = currentPassword;
            this.newPassword = newPassword;
        }
    }

    /** The password that confirms the prosumer really wants to leave. */
    public static class Deactivate {

        public String password;

        /** Holds the password typed in the confirmation dialog. */
        public Deactivate(String password) {
            this.password = password;
        }
    }
}
