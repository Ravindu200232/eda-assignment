/*
 * File:    AuthInterceptor.java
 * Module:  API access
 * Owner:   Ravindu
 * Purpose: Adds the login token to every request and watches for the answer
 *          "401 Unauthorized". When that happens with a token, the session is
 *          over (it ran out, the account was deactivated or the role changed),
 *          so the saved login is thrown away and the user is asked to sign in
 *          again.
 * Source:  AND-18 (OkHttp interceptors).
 */
package lk.sliit.solargrid.data.remote;

import androidx.annotation.NonNull;

import java.io.IOException;

import lk.sliit.solargrid.session.SessionStore;
import okhttp3.Interceptor;
import okhttp3.Request;
import okhttp3.Response;

public class AuthInterceptor implements Interceptor {

    private final SessionStore sessions;

    /** Needs the store that holds the token. */
    public AuthInterceptor(SessionStore sessions) {
        this.sessions = sessions;
    }

    /** Runs for every request the app makes. */
    @NonNull
    @Override
    public Response intercept(@NonNull Chain chain) throws IOException {
        String token = sessions.token();

        Request.Builder builder = chain.request().newBuilder()
                .header("Accept", "application/json");
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }

        Response response = chain.proceed(builder.build());

        if (response.code() == 401 && token != null) {
            sessions.endSession(ApiError.SESSION_ENDED);
        }
        return response;
    }
}
