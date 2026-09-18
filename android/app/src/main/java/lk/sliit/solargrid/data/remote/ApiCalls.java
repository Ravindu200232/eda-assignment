/*
 * File:    ApiCalls.java
 * Module:  API access
 * Owner:   Ravindu
 * Purpose: Sends a Retrofit call and hands the answer to the screen on the
 *          main thread. Every repository in the app goes through here, so the
 *          error handling and the test waiting are the same everywhere.
 * Source:  AND-17 (Retrofit enqueue and callbacks).
 */
package lk.sliit.solargrid.data.remote;

import androidx.annotation.NonNull;

import lk.sliit.solargrid.util.Idling;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public final class ApiCalls {

    /** Nobody builds this class; it is only a helper. */
    private ApiCalls() {
    }

    /**
     * Runs the call in the background and answers on the main thread. A call
     * that was cancelled (because the screen closed) is quietly dropped.
     */
    public static <T> void enqueue(@NonNull Call<T> call, @NonNull ApiCallback<T> callback) {
        Idling.begin();
        call.enqueue(new Callback<T>() {

            /** The server answered, with or without an error status. */
            @Override
            public void onResponse(@NonNull Call<T> sent, @NonNull Response<T> response) {
                Idling.end();
                if (response.isSuccessful()) {
                    callback.onSuccess(response.body());
                } else {
                    callback.onError(ApiError.from(response));
                }
            }

            /** The request never finished: no network, a timeout or bad JSON. */
            @Override
            public void onFailure(@NonNull Call<T> sent, @NonNull Throwable cause) {
                Idling.end();
                if (sent.isCanceled()) {
                    return;
                }
                callback.onError(ApiError.network(cause));
            }
        });
    }
}
