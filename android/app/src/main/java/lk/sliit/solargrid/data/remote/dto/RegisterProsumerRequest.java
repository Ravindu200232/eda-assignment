/*
 * File:    RegisterProsumerRequest.java
 * Module:  Prosumer Accounts
 * Owner:   Malith
 * Purpose: What the sign-up form sends to POST api/prosumers/register. The NIC
 *          becomes the account key, and the account waits for Backoffice
 *          activation before it can sign in.
 */
package lk.sliit.solargrid.data.remote.dto;

public class RegisterProsumerRequest {

    public String nic;
    public String fullName;
    public String email;
    public String phone;
    public String password;
    public String address;

    /** Optional: the electricity meter number from the CEB bill. */
    public String meterNumber;

    /** Optional: the size of the solar panels on the roof. */
    public Double solarCapacityKw;
}
