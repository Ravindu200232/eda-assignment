/*
 * File:    SolarGridApi.java
 * Module:  API access
 * Owner:   Ravindu
 * Purpose: Every call the app makes to the Web API, written once as a Java
 *          interface. Retrofit builds the HTTP requests from it. Each member
 *          adds the calls their own screens need, under their own heading.
 * Source:  AND-17 (Retrofit interfaces).
 */
package lk.sliit.solargrid.data.remote;

import lk.sliit.solargrid.data.remote.dto.CheckInResponse;
import lk.sliit.solargrid.data.remote.dto.CompleteTransferRequest;
import lk.sliit.solargrid.data.remote.dto.HealthDto;
import lk.sliit.solargrid.data.remote.dto.LoginRequest;
import lk.sliit.solargrid.data.remote.dto.LoginResponse;
import lk.sliit.solargrid.data.remote.dto.ReservationDto;
import lk.sliit.solargrid.data.remote.dto.UserDto;
import lk.sliit.solargrid.data.remote.dto.VerifyQrRequest;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.Path;

public interface SolarGridApi {

    // ----- Ravindu: sign in and the signed-in user -----

    /** Signs in with a NIC or an email address and returns the token. */
    @POST("api/auth/login")
    Call<LoginResponse> login(@Body LoginRequest request);

    /** The account of the signed-in user, used to check the token still works. */
    @GET("api/auth/me")
    Call<UserDto> me();

    /** Says whether the API and its database are running. */
    @GET("api/health")
    Call<HealthDto> health();

    // ----- Ravindu: operator check-in -----

    /** Checks a scanned QR code and says whether the transfer may be finished. */
    @POST("api/checkin/verify")
    Call<CheckInResponse> verifyQrCode(@Body VerifyQrRequest request);

    /** Records the delivered energy and closes the booking. */
    @POST("api/checkin/{reservationId}/complete")
    Call<ReservationDto> completeTransfer(@Path("reservationId") String reservationId,
                                          @Body CompleteTransferRequest request);
}
