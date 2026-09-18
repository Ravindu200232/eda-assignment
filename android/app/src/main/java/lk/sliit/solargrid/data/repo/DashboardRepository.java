/*
 * File:    DashboardRepository.java
 * Module:  Dashboards
 * Owner:   Malith
 * Purpose: Fetches the prosumer home screen numbers. The API counts the
 *          bookings itself, so the app never adds them up on its own and the
 *          numbers always match the web portal.
 */
package lk.sliit.solargrid.data.repo;

import lk.sliit.solargrid.data.remote.ApiCallback;
import lk.sliit.solargrid.data.remote.ApiCalls;
import lk.sliit.solargrid.data.remote.SolarGridApi;
import lk.sliit.solargrid.data.remote.dto.ProsumerDashboardDto;

public class DashboardRepository {

    private final SolarGridApi api;

    /** Needs the API calls. */
    public DashboardRepository(SolarGridApi api) {
        this.api = api;
    }

    /** The counts, the next booking and the coming bookings of the signed-in prosumer. */
    public void load(ApiCallback<ProsumerDashboardDto> callback) {
        ApiCalls.enqueue(api.myDashboard(), callback);
    }
}
