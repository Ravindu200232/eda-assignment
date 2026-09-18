/*
 * File:    FakeApi.java
 * Module:  Tests
 * Owner:   Ravindu
 * Purpose: A small web server that answers like the real Web API, so the local
 *          tests never need MongoDB, IIS or a network. The answers used here
 *          are copies of real answers from the running API.
 * Source:  AND-14 (OkHttp MockWebServer).
 */
package lk.sliit.solargrid.testing;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

import lk.sliit.solargrid.AppContainer;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.QueueDispatcher;
import okhttp3.mockwebserver.RecordedRequest;

public class FakeApi {

    private final MockWebServer server = new MockWebServer();

    /**
     * Starts the server and points the app at it. A request the test did not
     * prepare an answer for gets "404" at once, instead of waiting until the
     * app gives up after 20 seconds.
     */
    public void start() throws IOException {
        QueueDispatcher answers = new QueueDispatcher();
        answers.setFailFast(true);
        server.setDispatcher(answers);
        server.start();
        AppContainer.get().useBaseUrl(server.url("/").toString());
    }

    /** Stops the server at the end of a test. */
    public void stop() throws IOException {
        server.shutdown();
    }

    /** The address of the stand-in server, for a test that changes it back. */
    public String address() {
        return server.url("/").toString();
    }

    /** Adds one answer with a JSON body. */
    public void willAnswer(int status, String body) {
        server.enqueue(new MockResponse()
                .setResponseCode(status)
                .setHeader("Content-Type", "application/json")
                .setBody(body));
    }

    /** Adds one error answer in the ProblemDetails shape the API uses. */
    public void willFail(int status, String problemJson) {
        server.enqueue(new MockResponse()
                .setResponseCode(status)
                .setHeader("Content-Type", "application/problem+json")
                .setBody(problemJson));
    }

    /** Adds an empty answer, as the API sends for 204 and some errors. */
    public void willAnswerEmpty(int status) {
        server.enqueue(new MockResponse().setResponseCode(status));
    }

    /** The next request the app sent, so a test can check it. */
    public RecordedRequest requestSent() throws InterruptedException {
        RecordedRequest request = server.takeRequest(10, TimeUnit.SECONDS);
        if (request == null) {
            throw new AssertionError("The app did not send a request.");
        }
        return request;
    }
}
