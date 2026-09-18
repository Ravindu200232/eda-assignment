/*
 * File:    ProfileDao.java
 * Module:  Prosumer Accounts
 * Owner:   Malith
 * Purpose: Keeps the last known profile of the signed-in prosumer in SQLite,
 *          so the profile and the greeting on the home screen still show when
 *          the phone has no connection.
 * Source:  AND-09 (Android SQLiteOpenHelper and ContentValues).
 */
package lk.sliit.solargrid.data.local;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;

import androidx.annotation.Nullable;

import lk.sliit.solargrid.data.remote.dto.UserDto;
import lk.sliit.solargrid.util.Times;

public class ProfileDao {

    public static final String TABLE = "profile";

    static final String CREATE_TABLE =
            "CREATE TABLE IF NOT EXISTS " + TABLE + " ("
                    + "nic TEXT PRIMARY KEY, "
                    + "full_name TEXT NOT NULL, "
                    + "email TEXT, "
                    + "phone TEXT, "
                    + "address TEXT, "
                    + "meter_number TEXT, "
                    + "solar_kw REAL, "
                    + "status TEXT, "
                    + "updated_at TEXT NOT NULL)";

    private final SolarGridDbHelper helper;

    /** Needs the database helper. */
    public ProfileDao(SolarGridDbHelper helper) {
        this.helper = helper;
    }

    /** Saves the profile, replacing the older copy of the same NIC. */
    public void save(UserDto profile) {
        ContentValues values = new ContentValues();
        values.put("nic", profile.nic);
        values.put("full_name", profile.fullName);
        values.put("email", profile.email);
        values.put("phone", profile.phone);
        values.put("address", profile.address);
        values.put("meter_number", profile.meterNumber);
        if (profile.solarCapacityKw == null) {
            values.putNull("solar_kw");
        } else {
            values.put("solar_kw", profile.solarCapacityKw);
        }
        values.put("status", profile.status);
        values.put("updated_at", Times.nowIso());
        helper.getWritableDatabase().insertWithOnConflict(TABLE, null, values, SQLiteDatabase.CONFLICT_REPLACE);
    }

    /** The saved profile of this NIC, or null when there is none. */
    @Nullable
    public UserDto find(String nic) {
        try (Cursor cursor = helper.getReadableDatabase().query(
                TABLE, null, "nic = ?", new String[]{nic}, null, null, null)) {
            if (!cursor.moveToFirst()) {
                return null;
            }
            UserDto profile = new UserDto();
            profile.nic = text(cursor, "nic");
            profile.fullName = text(cursor, "full_name");
            profile.email = text(cursor, "email");
            profile.phone = text(cursor, "phone");
            profile.address = text(cursor, "address");
            profile.meterNumber = text(cursor, "meter_number");
            int solar = cursor.getColumnIndexOrThrow("solar_kw");
            profile.solarCapacityKw = cursor.isNull(solar) ? null : cursor.getDouble(solar);
            profile.status = text(cursor, "status");
            return profile;
        }
    }

    /** Reads one text column of the current row. */
    private static String text(Cursor cursor, String column) {
        int index = cursor.getColumnIndexOrThrow(column);
        return cursor.isNull(index) ? null : cursor.getString(index);
    }
}
