/*
 * File:    SessionDao.java
 * Module:  Local database
 * Owner:   Ravindu
 * Purpose: Keeps the login details (token, when it ends and who is signed in)
 *          in SQLite, so the app can open straight into the right home screen
 *          until the token expires.
 * Source:  AND-09 (Android SQLiteOpenHelper and ContentValues).
 */
package lk.sliit.solargrid.data.local;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;

import androidx.annotation.Nullable;

import lk.sliit.solargrid.data.model.Session;
import lk.sliit.solargrid.data.remote.dto.UserDto;

public class SessionDao {

    public static final String TABLE = "session";

    static final String CREATE_TABLE =
            "CREATE TABLE IF NOT EXISTS " + TABLE + " ("
                    + "id INTEGER PRIMARY KEY CHECK (id = 1), "
                    + "token TEXT NOT NULL, "
                    + "expires_at TEXT NOT NULL, "
                    + "nic TEXT NOT NULL, "
                    + "full_name TEXT NOT NULL, "
                    + "email TEXT, "
                    + "phone TEXT, "
                    + "role TEXT NOT NULL, "
                    + "status TEXT NOT NULL, "
                    + "saved_at TEXT NOT NULL)";

    private final SolarGridDbHelper helper;

    /** Needs the database helper. */
    public SessionDao(SolarGridDbHelper helper) {
        this.helper = helper;
    }

    /** Saves the session; there is only ever one row. */
    public void save(Session session) {
        ContentValues values = new ContentValues();
        values.put("id", 1);
        values.put("token", session.token);
        values.put("expires_at", session.expiresAt);
        values.put("nic", session.user.nic);
        values.put("full_name", session.user.fullName);
        values.put("email", session.user.email);
        values.put("phone", session.user.phone);
        values.put("role", session.user.role);
        values.put("status", session.user.status);
        values.put("saved_at", session.savedAt);
        helper.getWritableDatabase().insertWithOnConflict(TABLE, null, values, SQLiteDatabase.CONFLICT_REPLACE);
    }

    /** The saved session, or null when nobody is signed in. */
    @Nullable
    public Session find() {
        try (Cursor cursor = helper.getReadableDatabase().query(
                TABLE, null, "id = 1", null, null, null, null)) {
            if (!cursor.moveToFirst()) {
                return null;
            }
            UserDto user = new UserDto();
            user.nic = text(cursor, "nic");
            user.fullName = text(cursor, "full_name");
            user.email = text(cursor, "email");
            user.phone = text(cursor, "phone");
            user.role = text(cursor, "role");
            user.status = text(cursor, "status");
            return new Session(text(cursor, "token"), text(cursor, "expires_at"), text(cursor, "saved_at"), user);
        }
    }

    /** Forgets the session after logging out or when the token stops working. */
    public void clear() {
        helper.getWritableDatabase().delete(TABLE, null, null);
    }

    /** Reads one text column of the current row. */
    private static String text(Cursor cursor, String column) {
        int index = cursor.getColumnIndexOrThrow(column);
        return cursor.isNull(index) ? null : cursor.getString(index);
    }
}
