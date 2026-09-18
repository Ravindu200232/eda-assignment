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
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

import lk.sliit.solargrid.AppContainer;
import okhttp3.mockwebserver.Dispatcher;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.QueueDispatcher;
import okhttp3.mockwebserver.RecordedRequest;

public class FakeApi {

    private final MockWebServer server = new MockWebServer();
    private final QueueDispatcher queue = new QueueDispatcher();
    private final Map<String, MockResponse> byPath = new ConcurrentHashMap<>();
    private boolean running;

    /**
     * Starts the server and points the app at it. Answers tied to an address
     * are used first; everything else is answered in the order it was queued.
     * A request the test did not prepare an answer for gets "404" at once,
     * instead of waiting until the app gives up after 20 seconds.
     */
    public void start() throws IOException {
        queue.setFailFast(true);
        server.setDispatcher(new Dispatcher() {

            /** Picks the answer for one request. */
            @Override
            public MockResponse dispatch(RecordedRequest request) throws InterruptedException {
                // The longest matching address wins, so "/api/stations/1/slots"
                // is not answered by the rule for "/api/stations/1".
                String path = request.getPath() == null ? "" : request.getPath();
                String best = null;
                for (String start : byPath.keySet()) {
                    if (path.startsWith(start) && (best == null || start.length() > best.length())) {
                        best = start;
                    }
                }
                return best != null ? byPath.get(best) : queue.dispatch(request);
            }
        });
        server.start();
        running = true;
        AppContainer.get().useBaseUrl(server.url("/").toString());
    }

    /**
     * Stops the server. A test may stop it early to play "the server is gone";
     * the second stop at the end of the test then does nothing.
     */
    public void stop() throws IOException {
        if (running) {
            running = false;
            server.shutdown();
        }
    }

    /** The address of the stand-in server, for a test that changes it back. */
    public String address() {
        return server.url("/").toString();
    }

    /** Adds one answer with a JSON body. */
    public void willAnswer(int status, String body) {
        queue.enqueueResponse(json(status, body));
    }

    /**
     * Answers every request whose address starts with the given path, for
     * screens that send several requests at the same moment.
     */
    public void willAnswerPath(String pathStart, int status, String body) {
        byPath.put(pathStart, json(status, body));
    }

    /** Adds one error answer in the ProblemDetails shape the API uses. */
    public void willFail(int status, String problemJson) {
        queue.enqueueResponse(new MockResponse()
                .setResponseCode(status)
                .setHeader("Content-Type", "application/problem+json")
                .setBody(problemJson));
    }

    /** Adds an empty answer, as the API sends for 204 and some errors. */
    public void willAnswerEmpty(int status) {
        queue.enqueueResponse(new MockResponse().setResponseCode(status));
    }

    /** A JSON answer with the given status. */
    private static MockResponse json(int status, String body) {
        return new MockResponse()
                .setResponseCode(status)
                .setHeader("Content-Type", "application/json")
                .setBody(body);
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
