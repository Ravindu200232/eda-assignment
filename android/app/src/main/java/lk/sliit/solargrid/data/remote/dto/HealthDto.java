/*
 * File:    HealthDto.java
 * Module:  API access
 * Owner:   Ravindu
 * Purpose: What GET api/health sends back. The app uses it to tell a stopped
 *          server apart from a phone with no network.
 */
package lk.sliit.solargrid.data.remote.dto;

public class HealthDto {

    /** "Healthy" or "Unhealthy". */
    public String status;

    /** "Connected" or "Not reachable". */
    public String database;

    public String serverTimeUtc;
}
