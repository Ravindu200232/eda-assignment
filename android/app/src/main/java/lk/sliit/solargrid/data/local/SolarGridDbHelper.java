/*
 * File:    SolarGridDbHelper.java
 * Module:  Local database
 * Owner:   Ravindu
 * Purpose: Opens the app's SQLite database and creates its tables. Each
 *          feature keeps its own table script next to its data class, and
 *          every table is listed here. When a member adds a table, the
 *          version number goes up by one and the table is created on upgrade.
 * Source:  AND-09 (Android SQLiteOpenHelper).
 */
package lk.sliit.solargrid.data.local;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import androidx.annotation.NonNull;

public class SolarGridDbHelper extends SQLiteOpenHelper {

    public static final String DATABASE_NAME = "solargrid.db";

    /**
     * Version 1: the signed-in session (Ravindu).
     * Version 2: the prosumer profile (Malith).
     * Version 3: the stations for the map and the station list (Nimthara).
     */
    public static final int DATABASE_VERSION = 3;

    /** Every "CREATE TABLE IF NOT EXISTS" script in the app. */
    private static final String[] TABLES = {
            SessionDao.CREATE_TABLE,
            ProfileDao.CREATE_TABLE,
            StationDao.CREATE_TABLE,
    };

    /**
     * Tables that hold the data of one user. They are emptied when that user
     * logs out, so the next person to sign in on the phone sees none of it.
     */
    private static final String[] PERSONAL_TABLES = {
            SessionDao.TABLE,
            ProfileDao.TABLE,
    };

    /** Opens (or creates) solargrid.db for this app. */
    public SolarGridDbHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    /** Creates every table the first time the app runs. */
    @Override
    public void onCreate(@NonNull SQLiteDatabase db) {
        createTables(db);
    }

    /** Adds tables that newer versions of the app need. */
    @Override
    public void onUpgrade(@NonNull SQLiteDatabase db, int oldVersion, int newVersion) {
        createTables(db);
    }

    /** Forgets everything that belongs to the user who is logging out. */
    public void clearPersonalData() {
        SQLiteDatabase db = getWritableDatabase();
        for (String table : PERSONAL_TABLES) {
            db.delete(table, null, null);
        }
    }

    /** Runs every table script; each one is safe to run again. */
    private void createTables(SQLiteDatabase db) {
        for (String script : TABLES) {
            db.execSQL(script);
        }
    }
}
