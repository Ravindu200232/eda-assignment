/*
 * File:    UpdateProsumerRequest.java
 * Module:  Prosumer Accounts
 * Owner:   Malith
 * Purpose: What the profile form sends to PUT api/prosumers/me. The API
 *          replaces the whole profile, so every field is sent each time, even
 *          the ones the prosumer did not change.
 */
package lk.sliit.solargrid.data.remote.dto;

public class UpdateProsumerRequest {

    public String fullName;
    public String email;
    public String phone;
    public String address;
    public String meterNumber;
    public Double solarCapacityKw;

    /** Starts from the saved profile, so untouched fields keep their values. */
    public static UpdateProsumerRequest from(UserDto profile) {
        UpdateProsumerRequest request = new UpdateProsumerRequest();
        request.fullName = profile.fullName;
        request.email = profile.email;
        request.phone = profile.phone;
        request.address = profile.address;
        request.meterNumber = profile.meterNumber;
        request.solarCapacityKw = profile.solarCapacityKw;
        return request;
    }
}
