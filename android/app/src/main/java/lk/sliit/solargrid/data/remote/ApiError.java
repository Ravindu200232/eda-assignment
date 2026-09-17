/*
 * File:    ApiError.java
 * Module:  API access
 * Owner:   Ravindu
 * Purpose: Turns a failed request into something a person can read. It picks
 *          the best sentence the API gave us, and keeps the field messages so
 *          a form can mark the box that needs fixing. The app never writes its
 *          own version of a rule the API already explained.
 * Source:  AND-19 (ProblemDetails error format), AND-17 (Retrofit responses).
 */
package lk.sliit.solargrid.data.remote;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeoutException;

import lk.sliit.solargrid.data.remote.dto.ProblemDetails;
import retrofit2.Response;

public class ApiError {

    /** Used when the request never reached the server. */
    public static final int NO_ANSWER = 0;

    public static final String SESSION_ENDED = "Your session has ended. Please log in again.";

    private static final Gson GSON = new Gson();

    /**
     * The address the app is calling. It is kept here so the offline message
     * can name it, which saves a lot of guessing during the demo.
     */
    private static volatile String serverAddress = "the server";

    /** The HTTP status, or NO_ANSWER when the server never answered. */
    public final int status;

    /** The sentence to show the user. */
    public final String message;

    /** Form field name, then the first message for that field. */
    public final Map<String, String> fieldErrors;

    /** Keeps the status, the message and any field messages together. */
    private ApiError(int status, String message, Map<String, String> fieldErrors) {
        this.status = status;
        this.message = message;
        this.fieldErrors = Collections.unmodifiableMap(fieldErrors);
    }

    /** Remembers which API address the app is using, for the offline message. */
    public static void useServerAddress(String baseUrl) {
        serverAddress = baseUrl;
    }

    /** An error the app itself decided on, such as an empty form box. */
    public static ApiError of(String message) {
        return new ApiError(NO_ANSWER, message, new HashMap<>());
    }

    /** Reads the answer of a failed request (400, 401, 403, 409 and so on). */
    public static ApiError from(@NonNull Response<?> response) {
        ProblemDetails problem = readProblem(response);
        return new ApiError(response.code(), messageFor(response.code(), problem), fieldsOf(problem));
    }

    /** Used when the request could not be sent or the server did not answer. */
    public static ApiError network(@Nullable Throwable cause) {
        String message;
        if (cause instanceof SocketTimeoutException || cause instanceof TimeoutException) {
            message = "The server took too long to answer. Please try again.";
        } else {
            message = "Cannot reach the API at " + serverAddress
                    + ". Check that the server is running and that this device can see it.";
        }
        return new ApiError(NO_ANSWER, message, new HashMap<>());
    }

    /** True when the login token is missing, finished or no longer accepted. */
    public boolean isSessionEnded() {
        return status == 401;
    }

    /** True when the server never answered, so cached data is worth showing. */
    public boolean isOffline() {
        return status == NO_ANSWER;
    }

    /** The message for one form box, or null when that box is fine. */
    @Nullable
    public String fieldError(String fieldName) {
        return fieldErrors.get(fieldName);
    }

    /** Reads the error body, which the API sends as ProblemDetails JSON. */
    @Nullable
    private static ProblemDetails readProblem(Response<?> response) {
        if (response.errorBody() == null) {
            return null;
        }
        try {
            return GSON.fromJson(response.errorBody().string(), ProblemDetails.class);
        } catch (IOException | JsonSyntaxException | IllegalStateException ignored) {
            // Health checks and unknown routes answer without a JSON body.
            return null;
        }
    }

    /** Picks the most useful sentence: the API first, then a general one. */
    private static String messageFor(int status, @Nullable ProblemDetails problem) {
        if (problem != null) {
            if (problem.detail != null && !problem.detail.trim().isEmpty()) {
                return problem.detail;
            }
            if (problem.title != null && !problem.title.trim().isEmpty()) {
                return problem.title;
            }
        }
        switch (status) {
            case 401:
                return SESSION_ENDED;
            case 403:
                return "You do not have permission to do this.";
            case 404:
                return "The record was not found.";
            case 503:
                return "The server is not ready yet. Please try again in a moment.";
            default:
                return "Something went wrong. Please try again.";
        }
    }

    /**
     * Turns the validation list into one message per field. The API sends
     * names such as "FullName" or "$.role", while the screens use "fullName"
     * and "role", so the first letter is made small.
     */
    private static Map<String, String> fieldsOf(@Nullable ProblemDetails problem) {
        Map<String, String> result = new HashMap<>();
        if (problem == null || problem.errors == null) {
            return result;
        }
        for (Map.Entry<String, List<String>> entry : problem.errors.entrySet()) {
            String key = entry.getKey();
            if (key == null || key.isEmpty()) {
                continue;
            }
            boolean fromJsonReader = key.startsWith("$");
            String name = fieldName(key);
            List<String> messages = entry.getValue();
            String text = fromJsonReader || messages == null || messages.isEmpty()
                    ? "This value is not valid."
                    : messages.get(0);
            if (!name.isEmpty() && !result.containsKey(name)) {
                result.put(name, text);
            }
        }
        return result;
    }

    /** "FullName" and "$.fullName" both become "fullName". */
    private static String fieldName(String key) {
        String cleaned = key.startsWith("$.") ? key.substring(2) : key.startsWith("$") ? key.substring(1) : key;
        String[] parts = cleaned.split("\\.");
        StringBuilder name = new StringBuilder();
        for (String part : parts) {
            if (part.isEmpty()) {
                continue;
            }
            if (name.length() > 0) {
                name.append('.');
            }
            name.append(Character.toLowerCase(part.charAt(0))).append(part.substring(1));
        }
        return name.toString();
    }
}
