/*
 * File:    SolarGridApp.java
 * Module:  Core
 * Owner:   Ravindu
 * Purpose: The application object. It prepares the shared parts of the app
 *          (local database, saved session and the Web API client) once, when
 *          the app starts.
 */
package lk.sliit.solargrid;

import android.app.Application;

public class SolarGridApp extends Application {

    /** Prepares the shared parts of the app before the first screen opens. */
    @Override
    public void onCreate() {
        super.onCreate();
        AppContainer.init(this);
    }
}
