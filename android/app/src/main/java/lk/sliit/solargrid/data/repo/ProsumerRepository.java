/*
 * File:    ProsumerRepository.java
 * Module:  Prosumer Accounts
 * Owner:   Malith
 * Purpose: Everything a prosumer does with their own account: sign up, read
 *          and change the profile, and close the account.
 *          The last profile the API sent is kept in SQLite, so the screens can
 *          show it straight away and still show it without a connection.
 * Source:  AND-21 (background work with an executor).
 */
package lk.sliit.solargrid.data.repo;

import android.os.Handler;
import android.os.Looper;

import androidx.annotation.Nullable;

import java.util.concurrent.Executor;

import lk.sliit.solargrid.data.local.ProfileDao;
import lk.sliit.solargrid.data.remote.ApiCallback;
import lk.sliit.solargrid.data.remote.ApiCalls;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.data.remote.SolarGridApi;
import lk.sliit.solargrid.data.remote.dto.PasswordRequests;
import lk.sliit.solargrid.data.remote.dto.RegisterProsumerRequest;
import lk.sliit.solargrid.data.remote.dto.UpdateProsumerRequest;
import lk.sliit.solargrid.data.remote.dto.UserDto;
import lk.sliit.solargrid.session.SessionStore;

public class ProsumerRepository {

    /** Told when the saved profile has been read from SQLite. */
    public interface SavedProfileCallback {

        /** Runs on the main thread with the saved profile, or null when there is none. */
        void onLoaded(@Nullable UserDto profile);
    }

    private final SolarGridApi api;
    private final SessionStore sessions;
    private final ProfileDao profiles;
    private final Executor worker;
    private final Handler mainThread = new Handler(Looper.getMainLooper());

    /** Needs the API, the session, the profile table and the database thread. */
    public ProsumerRepository(SolarGridApi api, SessionStore sessions, ProfileDao profiles, Executor worker) {
        this.api = api;
        this.sessions = sessions;
        this.profiles = profiles;
        this.worker = worker;
    }

    /** Creates the account. The API keeps it pending until Backoffice activates it. */
    public void register(RegisterProsumerRequest request, ApiCallback<UserDto> callback) {
        ApiCalls.enqueue(api.registerProsumer(request), callback);
    }

    /** Reads the profile saved on the phone for the signed-in prosumer. */
    public void savedProfile(SavedProfileCallback callback) {
        UserDto user = sessions.user();
        if (user == null) {
            callback.onLoaded(null);
            return;
        }
        worker.execute(() -> {
            UserDto saved = profiles.find(user.nic);
            mainThread.post(() -> callback.onLoaded(saved));
        });
    }

    /** Asks the API for the newest profile and keeps a copy of it. */
    public void refreshProfile(ApiCallback<UserDto> callback) {
        ApiCalls.enqueue(api.myProfile(), keepProfile(callback));
    }

    /** Sends the whole profile, because the API replaces it rather than merging. */
    public void updateProfile(UpdateProsumerRequest request, ApiCallback<UserDto> callback) {
        ApiCalls.enqueue(api.updateMyProfile(request), keepProfile(callback));
    }

    /**
     * Closes the account after the API has checked the password. The session
     * and the saved data are then forgotten, because the token stops working.
     */
    public void deactivate(String password, ApiCallback<Void> callback) {
        ApiCalls.enqueue(api.deactivateMyAccount(new PasswordRequests.Deactivate(password)), new ApiCallback<Void>() {

            /** The account is closed, so nothing of it stays on the phone. */
            @Override
            public void onSuccess(Void nothing) {
                sessions.clear();
                callback.onSuccess(null);
            }

            /** A wrong password, or the API refused for another reason. */
            @Override
            public void onError(ApiError error) {
                callback.onError(error);
            }
        });
    }

    /** Saves a profile that came back from the API, then passes it on. */
    private ApiCallback<UserDto> keepProfile(ApiCallback<UserDto> callback) {
        return new ApiCallback<UserDto>() {

            /** Updates the saved copy and the name in the session. */
            @Override
            public void onSuccess(UserDto profile) {
                if (profile != null) {
                    sessions.updateUser(profile);
                    worker.execute(() -> profiles.save(profile));
                }
                callback.onSuccess(profile);
            }

            /** Passes the problem on unchanged. */
            @Override
            public void onError(ApiError error) {
                callback.onError(error);
            }
        };
    }
}
