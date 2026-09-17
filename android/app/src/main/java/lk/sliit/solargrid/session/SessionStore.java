/*
 * File:    SessionStore.java
 * Module:  Core
 * Owner:   Ravindu
 * Purpose: Holds the signed-in user while the app is open and keeps the same
 *          details in SQLite, so the app opens on the right home screen
 *          without asking for the password again. Database work happens on a
 *          background thread; the value in memory is read from any thread.
 * Source:  AND-09 (SQLite storage), AND-21 (background work with an executor).
 */
package lk.sliit.solargrid.session;

import android.os.Handler;
import android.os.Looper;

import androidx.annotation.Nullable;

import java.time.Instant;
import java.util.concurrent.Executor;

import lk.sliit.solargrid.data.local.SessionDao;
import lk.sliit.solargrid.data.local.SolarGridDbHelper;
import lk.sliit.solargrid.data.model.Session;
import lk.sliit.solargrid.data.remote.dto.UserDto;
import lk.sliit.solargrid.util.Times;

public class SessionStore {

    /** Told when the saved session has been read from SQLite. */
    public interface LoadCallback {

        /** Runs on the main thread with the saved session, or null when there is none. */
        void onLoaded(@Nullable Session session);
    }

    private final SessionDao dao;
    private final Executor worker;
    private final Handler mainThread = new Handler(Looper.getMainLooper());

    private volatile Session session;
    private volatile boolean loaded;
    private volatile String endedReason;

    /** Needs the database and the background thread it should use. */
    public SessionStore(SolarGridDbHelper helper, Executor worker) {
        this.dao = new SessionDao(helper);
        this.worker = worker;
    }

    /** Reads the saved session in the background; the splash screen waits for it. */
    public void load(LoadCallback callback) {
        worker.execute(() -> {
            Session saved = readOnce();
            mainThread.post(() -> callback.onLoaded(saved));
        });
    }

    /**
     * The session in memory. If a screen is opened again after Android closed
     * the app, the row is read here instead, which is a single small query.
     */
    @Nullable
    public Session current() {
        if (!loaded) {
            return readOnce();
        }
        return session;
    }

    /** True when somebody is signed in and the token still works. */
    public boolean isSignedIn() {
        Session current = current();
        return current != null && current.isLive();
    }

    /** The token for the next request, or null when nobody is signed in. */
    @Nullable
    public String token() {
        Session current = current();
        return current == null ? null : current.token;
    }

    /** The signed-in user, or null when nobody is signed in. */
    @Nullable
    public UserDto user() {
        Session current = current();
        return current == null ? null : current.user;
    }

    /** The role of the signed-in user, or null. */
    @Nullable
    public String role() {
        UserDto user = user();
        return user == null ? null : user.role;
    }

    /** Saves a new login, both in memory and in SQLite. */
    public Session save(String token, String expiresAt, UserDto user) {
        Session fresh = new Session(token, expiresAt, Times.nowIso(), user);
        this.session = fresh;
        this.loaded = true;
        this.endedReason = null;
        worker.execute(() -> dao.save(fresh));
        return fresh;
    }

    /** Keeps the same token but stores newer details of the user. */
    public void updateUser(UserDto user) {
        Session current = current();
        if (current == null || user == null) {
            return;
        }
        Session fresh = new Session(current.token, current.expiresAt, Times.nowIso(), user);
        this.session = fresh;
        worker.execute(() -> dao.save(fresh));
    }

    /** Forgets the session after the user taps "Log out". */
    public void clear() {
        this.session = null;
        this.loaded = true;
        worker.execute(dao::clear);
    }

    /**
     * Ends the session because the API refused the token. The reason is kept
     * so the login screen can explain what happened. This may be called from
     * a background thread by the interceptor.
     */
    public void endSession(String reason) {
        if (current() == null) {
            return;
        }
        this.endedReason = reason;
        clear();
    }

    /**
     * The reason the session ended, shown once on the login screen and then
     * forgotten.
     */
    @Nullable
    public String takeEndedReason() {
        String reason = endedReason;
        endedReason = null;
        return reason;
    }

    /** True when the saved token has run out, so the user must log in again. */
    public boolean isExpired() {
        Session current = current();
        return current != null && current.isExpired(Instant.now());
    }

    /** Reads the row from SQLite and keeps it in memory. */
    @Nullable
    private synchronized Session readOnce() {
        if (!loaded) {
            session = dao.find();
            loaded = true;
        }
        return session;
    }
}
