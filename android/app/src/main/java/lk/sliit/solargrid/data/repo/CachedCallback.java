/*
 * File:    CachedCallback.java
 * Module:  Stations
 * Owner:   Nimthara
 * Purpose: How a screen hears the answer of a call that has a copy on the
 *          phone. When the API cannot be reached the saved copy is handed over
 *          together with the reason, so the screen can show the data and say
 *          that it may be old. Both methods run on the main thread.
 */
package lk.sliit.solargrid.data.repo;

import androidx.annotation.Nullable;

import lk.sliit.solargrid.data.remote.ApiError;

public interface CachedCallback<T> {

    /**
     * The data to show. The reason is null when it came from the API, and
     * says why the API could not be reached when it came from the phone.
     */
    void onResult(T value, @Nullable ApiError offlineReason);

    /** Nothing could be shown: the call failed and there is no saved copy. */
    void onError(ApiError error);
}
