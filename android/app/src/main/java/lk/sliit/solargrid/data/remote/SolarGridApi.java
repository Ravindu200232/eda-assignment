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

import java.util.List;

import lk.sliit.solargrid.data.remote.dto.BatterySlotsRequest;
import lk.sliit.solargrid.data.remote.dto.BookingRequests;
import lk.sliit.solargrid.data.remote.dto.CheckInResponse;
import lk.sliit.solargrid.data.remote.dto.CompleteTransferRequest;
import lk.sliit.solargrid.data.remote.dto.HealthDto;
import lk.sliit.solargrid.data.remote.dto.LoginRequest;
import lk.sliit.solargrid.data.remote.dto.LoginResponse;
import lk.sliit.solargrid.data.remote.dto.PasswordRequests;
import lk.sliit.solargrid.data.remote.dto.ProsumerDashboardDto;
import lk.sliit.solargrid.data.remote.dto.QrCodeDto;
import lk.sliit.solargrid.data.remote.dto.RegisterProsumerRequest;
import lk.sliit.solargrid.data.remote.dto.ReservationDto;
import lk.sliit.solargrid.data.remote.dto.ReservationPageDto;
import lk.sliit.solargrid.data.remote.dto.SlotDto;
import lk.sliit.solargrid.data.remote.dto.StaffDashboardDto;
import lk.sliit.solargrid.data.remote.dto.StationDto;
import lk.sliit.solargrid.data.remote.dto.UpdateProsumerRequest;
import lk.sliit.solargrid.data.remote.dto.UserDto;
import lk.sliit.solargrid.data.remote.dto.VerifyQrRequest;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.PATCH;
import retrofit2.http.POST;
import retrofit2.http.PUT;
import retrofit2.http.Path;
import retrofit2.http.Query;

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

    // ----- Malith: prosumer accounts and the dashboard -----

    /** Creates a prosumer account, which then waits for Backoffice activation. */
    @POST("api/prosumers/register")
    Call<UserDto> registerProsumer(@Body RegisterProsumerRequest request);

    /** The full profile of the signed-in prosumer. */
    @GET("api/prosumers/me")
    Call<UserDto> myProfile();

    /** Replaces the profile of the signed-in prosumer. */
    @PUT("api/prosumers/me")
    Call<UserDto> updateMyProfile(@Body UpdateProsumerRequest request);

    /** Closes the account of the signed-in prosumer; only Backoffice can open it again. */
    @POST("api/prosumers/me/deactivate")
    Call<Void> deactivateMyAccount(@Body PasswordRequests.Deactivate request);

    /** Changes the password of whoever is signed in. */
    @POST("api/auth/change-password")
    Call<Void> changePassword(@Body PasswordRequests.ChangePassword request);

    /** The numbers and the coming bookings for the prosumer home screen. */
    @GET("api/dashboard/my-summary")
    Call<ProsumerDashboardDto> myDashboard();

    // ----- Nimthara: stations, slots and battery bays -----

    /** The stations, optionally filtered by a name, code or address. */
    @GET("api/stations")
    Call<List<StationDto>> stations(@Query("search") String search);

    /** Up to 20 stations around a point, nearest first. */
    @GET("api/stations/nearby")
    Call<List<StationDto>> nearbyStations(@Query("lat") String latitude, @Query("lng") String longitude,
                                          @Query("radiusKm") String radiusKm);

    /** One station with its weekly schedule. */
    @GET("api/stations/{id}")
    Call<StationDto> station(@Path("id") String stationId);

    /** The slots of a station between two Sri Lankan dates (both included). */
    @GET("api/stations/{id}/slots")
    Call<List<SlotDto>> stationSlots(@Path("id") String stationId, @Query("from") String fromDate,
                                     @Query("to") String toDate);

    /** Sets how many battery bays are free now (Grid Operators). */
    @PATCH("api/stations/{id}/battery-slots")
    Call<StationDto> updateBatterySlots(@Path("id") String stationId, @Body BatterySlotsRequest request);

    // ----- Hamnad: bookings and their QR codes -----

    /** A page of bookings. Every filter is optional; the API keeps prosumers to their own. */
    @GET("api/reservations")
    Call<ReservationPageDto> reservations(@Query("scope") String scope, @Query("status") String status,
                                          @Query("stationId") String stationId, @Query("from") String fromDate,
                                          @Query("to") String toDate, @Query("search") String search,
                                          @Query("page") Integer page, @Query("pageSize") Integer pageSize);

    /** One booking with its rule flags (canModify, hasQrCode, isPast). */
    @GET("api/reservations/{id}")
    Call<ReservationDto> reservation(@Path("id") String id);

    /** Books a slot; the booking waits for Backoffice approval. */
    @POST("api/reservations")
    Call<ReservationDto> createReservation(@Body BookingRequests.Booking request);

    /** Changes the slot, energy or direction (12-hour notice). */
    @PUT("api/reservations/{id}")
    Call<ReservationDto> updateReservation(@Path("id") String id, @Body BookingRequests.Booking request);

    /** Cancels a booking (12-hour notice, for prosumers and staff alike). */
    @POST("api/reservations/{id}/cancel")
    Call<ReservationDto> cancelReservation(@Path("id") String id, @Body BookingRequests.Cancel request);

    /** The signed QR text of an approved booking. */
    @GET("api/reservations/{id}/qr")
    Call<QrCodeDto> reservationQr(@Path("id") String id);

    /** The staff numbers for the operator "Today" tab (Grid Operators and Backoffice only). */
    @GET("api/dashboard/summary")
    Call<StaffDashboardDto> staffDashboard();
}
