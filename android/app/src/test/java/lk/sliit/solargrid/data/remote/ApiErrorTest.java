/*
 * File:    ApiErrorTest.java
 * Module:  Tests
 * Owner:   Ravindu
 * Purpose: Checks that a failed request turns into the sentence the API wrote,
 *          and that validation messages end up on the right form box.
 */
package lk.sliit.solargrid.data.remote;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

import java.net.SocketTimeoutException;

import okhttp3.MediaType;
import okhttp3.ResponseBody;
import retrofit2.Response;

public class ApiErrorTest {

    private static final MediaType PROBLEM_JSON = MediaType.get("application/problem+json");

    /** The "detail" line is written for the user, so it wins. */
    @Test
    public void usesTheDetailFromTheApi() {
        ApiError error = errorFrom(403, "{\"title\":\"Account not active\",\"status\":403,"
                + "\"detail\":\"Your account is waiting for Backoffice activation.\"}");

        assertEquals("Your account is waiting for Backoffice activation.", error.message);
        assertFalse(error.isSessionEnded());
    }

    /** With no detail, the short title is shown instead. */
    @Test
    public void fallsBackToTheTitle() {
        ApiError error = errorFrom(409, "{\"title\":\"Slot already booked\",\"status\":409}");

        assertEquals("Slot already booked", error.message);
    }

    /** Validation messages are sorted onto the boxes of the form. */
    @Test
    public void putsValidationMessagesOnTheirFields() {
        ApiError error = errorFrom(400, "{\"title\":\"One or more validation errors occurred.\","
                + "\"status\":400,\"errors\":{\"Username\":[\"Enter your NIC or email.\"],"
                + "\"Password\":[\"Enter your password.\"]}}");

        assertEquals("Enter your NIC or email.", error.fieldError("username"));
        assertEquals("Enter your password.", error.fieldError("password"));
        assertNull(error.fieldError("email"));
    }

    /** A message from the JSON reader is replaced by plain words. */
    @Test
    public void explainsAValueTheJsonReaderRefused() {
        ApiError error = errorFrom(400, "{\"title\":\"Validation failed\",\"status\":400,"
                + "\"errors\":{\"$.tradeType\":[\"The JSON value could not be converted.\"]}}");

        assertEquals("This value is not valid.", error.fieldError("tradeType"));
    }

    /** A refused token always says the session is over. */
    @Test
    public void explainsARefusedToken() {
        ApiError error = errorFrom(401, "");

        assertTrue(error.isSessionEnded());
        assertEquals(ApiError.SESSION_ENDED, error.message);
    }

    /** A page that is not there gets short, clear words. */
    @Test
    public void explainsAMissingRecord() {
        ApiError error = errorFrom(404, "");

        assertEquals("The record was not found.", error.message);
    }

    /** A timeout is named, because it usually means a stopped server. */
    @Test
    public void explainsATimeout() {
        ApiError error = ApiError.network(new SocketTimeoutException("timeout"));

        assertTrue(error.isOffline());
        assertEquals("The server took too long to answer. Please try again.", error.message);
    }

    /** The unreachable-server message names the address the app is calling. */
    @Test
    public void namesTheServerThatCouldNotBeReached() {
        ApiError.useServerAddress("http://10.0.2.2:8080/");

        ApiError error = ApiError.network(new java.io.IOException("no route"));

        assertTrue(error.message, error.message.contains("http://10.0.2.2:8080/"));
    }

    /** Builds a failed answer the way Retrofit hands it to the app. */
    private static ApiError errorFrom(int status, String body) {
        return ApiError.from(Response.error(status, ResponseBody.create(body, PROBLEM_JSON)));
    }
}
