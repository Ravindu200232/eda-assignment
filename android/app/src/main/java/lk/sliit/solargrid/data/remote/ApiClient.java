/*
 * File:    ApiClient.java
 * Module:  API access
 * Owner:   Ravindu
 * Purpose: Builds the Retrofit client: where the API lives, how long the app
 *          waits for an answer, the token header and the JSON reader. It is
 *          the only place in the app that knows about HTTP.
 * Source:  AND-17 (Retrofit set-up), AND-18 (OkHttp client, timeouts and logging).
 */
package lk.sliit.solargrid.data.remote;

import java.util.concurrent.TimeUnit;

import lk.sliit.solargrid.BuildConfig;
import lk.sliit.solargrid.session.SessionStore;
import okhttp3.OkHttpClient;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public final class ApiClient {

    /** The server gets 20 seconds to answer, as in the web portal. */
    private static final long TIMEOUT_SECONDS = 20;

    /** Nobody builds this class; it only makes the API object. */
    private ApiClient() {
    }

    /** Makes the API object for one address, using the given session for the token. */
    public static SolarGridApi create(String baseUrl, SessionStore sessions) {
        ApiError.useServerAddress(baseUrl);

        OkHttpClient http = new OkHttpClient.Builder()
                .connectTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .writeTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .addInterceptor(new AuthInterceptor(sessions))
                .addInterceptor(logging())
                .build();

        return new Retrofit.Builder()
                .baseUrl(baseUrl)
                .client(http)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(SolarGridApi.class);
    }

    /**
     * While developing, the request line of every call is written to Logcat,
     * which makes a wrong address easy to spot. The token is never printed,
     * and a release build logs nothing at all.
     */
    private static HttpLoggingInterceptor logging() {
        HttpLoggingInterceptor logger = new HttpLoggingInterceptor();
        logger.setLevel(BuildConfig.DEBUG ? HttpLoggingInterceptor.Level.BASIC : HttpLoggingInterceptor.Level.NONE);
        logger.redactHeader("Authorization");
        return logger;
    }
}
