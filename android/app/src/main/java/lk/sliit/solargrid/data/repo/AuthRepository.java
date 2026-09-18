/*
 * File:    AuthRepository.java
 * Module:  Authentication
 * Owner:   Ravindu
 * Purpose: Signing in, checking the saved token and signing out. The screens
 *          talk to this class instead of the API, so the rules about where the
 *          session is kept stay in one file.
 */
package lk.sliit.solargrid.data.repo;

import lk.sliit.solargrid.data.model.Session;
import lk.sliit.solargrid.data.remote.ApiCallback;
import lk.sliit.solargrid.data.remote.ApiCalls;
import lk.sliit.solargrid.data.remote.ApiError;
import lk.sliit.solargrid.data.remote.SolarGridApi;
import lk.sliit.solargrid.data.remote.dto.LoginRequest;
import lk.sliit.solargrid.data.remote.dto.LoginResponse;
import lk.sliit.solargrid.data.remote.dto.UserDto;
import lk.sliit.solargrid.session.SessionStore;

public class AuthRepository {

    private final SolarGridApi api;
    private final SessionStore sessions;

    /** Needs the API calls and the place where the session is kept. */
    public AuthRepository(SolarGridApi api, SessionStore sessions) {
        this.api = api;
        this.sessions = sessions;
    }

    /**
     * Signs in with a NIC or an email address. The API decides whether the
     * account may sign in at all; a pending or deactivated account is refused
     * with its own message, which the screen shows as it came.
     */
    public void login(String username, String password, ApiCallback<Session> callback) {
        ApiCalls.enqueue(api.login(new LoginRequest(username, password)), new ApiCallback<LoginResponse>() {

            /** Keeps the token and opens the home screen for that role. */
            @Override
            public void onSuccess(LoginResponse body) {
                if (body == null || body.token == null || body.user == null) {
                    callback.onError(ApiError.of("The server sent a login answer the app could not read."));
                    return;
                }
                callback.onSuccess(sessions.save(body.token, body.expiresAt, body.user));
            }

            /** A wrong password, a refused account or no network. */
            @Override
            public void onError(ApiError error) {
                callback.onError(error);
            }
        });
    }

    /**
     * Asks the API who the token belongs to. It is used when the app opens
     * with a saved login, so a deactivated account or a changed role is caught
     * before any screen shows old details.
     */
    public void refreshUser(ApiCallback<UserDto> callback) {
        ApiCalls.enqueue(api.me(), new ApiCallback<UserDto>() {

            /** Stores the newer details next to the same token. */
            @Override
            public void onSuccess(UserDto user) {
                if (user != null) {
                    sessions.updateUser(user);
                }
                callback.onSuccess(user);
            }

            /** The token was refused or the server could not be reached. */
            @Override
            public void onError(ApiError error) {
                callback.onError(error);
            }
        });
    }

    /** Forgets the saved login. The API keeps no session, so there is no call. */
    public void logOut() {
        sessions.clear();
    }
}
