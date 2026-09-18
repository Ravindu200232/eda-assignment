/*
 * File:    Session.java
 * Module:  Core
 * Owner:   Ravindu
 * Purpose: The signed-in user together with their token. The same shape is
 *          stored in SQLite, so the app can open without logging in again.
 */
package lk.sliit.solargrid.data.model;

import java.time.Instant;

import lk.sliit.solargrid.data.remote.dto.UserDto;
import lk.sliit.solargrid.util.Times;

public class Session {

    /** The JWT sent with every later request. */
    public final String token;

    /** When the token stops working (UTC, as the API sent it). */
    public final String expiresAt;

    /** When this app saved the session (UTC). */
    public final String savedAt;

    /** Who is signed in. */
    public final UserDto user;

    /** Keeps the token, its end time and the user together. */
    public Session(String token, String expiresAt, String savedAt, UserDto user) {
        this.token = token;
        this.expiresAt = expiresAt;
        this.savedAt = savedAt;
        this.user = user;
    }

    /** True when the token has run out, so the user must log in again. */
    public boolean isExpired(Instant now) {
        Instant end = Times.toInstant(expiresAt);
        // A token with an unreadable end time is treated as finished.
        return end == null || !end.isAfter(now);
    }

    /** True when the token still works right now. */
    public boolean isLive() {
        return !isExpired(Instant.now());
    }
}
