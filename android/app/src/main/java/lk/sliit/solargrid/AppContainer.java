/*
 * File:    AppContainer.java
 * Module:  Core
 * Owner:   Ravindu
 * Purpose: One place that builds and hands out the shared objects: the local
 *          database, the saved session, the Web API client and the
 *          repositories. Screens ask for what they need instead of creating
 *          their own copies.
 */
package lk.sliit.solargrid;

import android.content.Context;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import lk.sliit.solargrid.data.local.ProfileDao;
import lk.sliit.solargrid.data.local.SolarGridDbHelper;
import lk.sliit.solargrid.data.local.StationDao;
import lk.sliit.solargrid.data.remote.ApiClient;
import lk.sliit.solargrid.data.remote.SolarGridApi;
import lk.sliit.solargrid.data.repo.AuthRepository;
import lk.sliit.solargrid.data.repo.CheckInRepository;
import lk.sliit.solargrid.data.repo.DashboardRepository;
import lk.sliit.solargrid.data.repo.ProsumerRepository;
import lk.sliit.solargrid.data.repo.StationRepository;
import lk.sliit.solargrid.session.SessionStore;
import lk.sliit.solargrid.util.LocationFinder;

public final class AppContainer {

    private static AppContainer instance;

    private final Context appContext;
    private final SolarGridDbHelper dbHelper;
    private final ExecutorService worker;
    private final SessionStore sessionStore;

    private final ProfileDao profileDao;
    private final StationDao stationDao;
    private LocationFinder locationFinder = new LocationFinder.Fused();

    private String baseUrl;
    private SolarGridApi api;
    private AuthRepository authRepository;
    private CheckInRepository checkInRepository;
    private ProsumerRepository prosumerRepository;
    private DashboardRepository dashboardRepository;
    private StationRepository stationRepository;

    /** Builds everything the app shares. Only AppContainer.init() calls this. */
    private AppContainer(Context context) {
        this.appContext = context.getApplicationContext();
        this.dbHelper = new SolarGridDbHelper(appContext);
        this.worker = Executors.newSingleThreadExecutor();
        this.sessionStore = new SessionStore(dbHelper, worker);
        this.profileDao = new ProfileDao(dbHelper);
        this.stationDao = new StationDao(dbHelper);
        useBaseUrl(BuildConfig.API_BASE_URL);
    }

    /**
     * Called when the app starts. A second app object means a new run (the
     * local tests start one per test), so the shared objects are built again
     * for it instead of keeping the old database and session.
     */
    public static synchronized void init(Context context) {
        Context application = context.getApplicationContext();
        if (instance == null || instance.appContext != application) {
            instance = new AppContainer(application);
        }
    }

    /** The shared container. The app object creates it before any screen opens. */
    public static synchronized AppContainer get() {
        if (instance == null) {
            throw new IllegalStateException("AppContainer.init() was not called.");
        }
        return instance;
    }

    /** Points the app at another API address. The tests use this. */
    public synchronized void useBaseUrl(String url) {
        this.baseUrl = url.endsWith("/") ? url : url + "/";
        this.api = ApiClient.create(this.baseUrl, sessionStore);
        this.authRepository = new AuthRepository(api, sessionStore);
        this.checkInRepository = new CheckInRepository(api);
        this.prosumerRepository = new ProsumerRepository(api, sessionStore, profileDao, worker);
        this.dashboardRepository = new DashboardRepository(api);
        this.stationRepository = new StationRepository(api, stationDao, worker);
    }

    /** The API address the app is using. */
    public synchronized String baseUrl() {
        return baseUrl;
    }

    /** The Web API calls. */
    public synchronized SolarGridApi api() {
        return api;
    }

    /** Sign-in and session handling. */
    public synchronized AuthRepository auth() {
        return authRepository;
    }

    /** Operator check-in calls. */
    public synchronized CheckInRepository checkIn() {
        return checkInRepository;
    }

    /** The prosumer own account: sign-up, profile, password and deactivation. */
    public synchronized ProsumerRepository prosumers() {
        return prosumerRepository;
    }

    /** The numbers on the prosumer home screen. */
    public synchronized DashboardRepository dashboard() {
        return dashboardRepository;
    }

    /** Stations, their slots and battery bays. */
    public synchronized StationRepository stations() {
        return stationRepository;
    }

    /** Where the phone is, for the map of nearby stations. */
    public synchronized LocationFinder location() {
        return locationFinder;
    }

    /** Replaces the location finder. The tests use a fixed place. */
    public synchronized void useLocationFinder(LocationFinder finder) {
        this.locationFinder = finder;
    }

    /** The signed-in user and their token. */
    public SessionStore session() {
        return sessionStore;
    }

    /** The local SQLite database. */
    public SolarGridDbHelper database() {
        return dbHelper;
    }

    /** Background thread for database work. */
    public ExecutorService worker() {
        return worker;
    }
}
