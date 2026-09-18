/*
 * File:    StationDao.java
 * Module:  Stations
 * Owner:   Nimthara
 * Purpose: Keeps the stations the app has seen in SQLite, so the list of
 *          stations and their details still show without a connection. The
 *          weekly schedule is kept as a small piece of JSON in one column.
 *          Stations are not personal, so they stay after a logout.
 * Source:  AND-09 (Android SQLiteOpenHelper and ContentValues).
 */
package lk.sliit.solargrid.data.local;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;

import androidx.annotation.Nullable;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;

import lk.sliit.solargrid.data.remote.dto.StationDto;
import lk.sliit.solargrid.util.Times;

public class StationDao {

    public static final String TABLE = "stations";

    static final String CREATE_TABLE =
            "CREATE TABLE IF NOT EXISTS " + TABLE + " ("
                    + "id TEXT PRIMARY KEY, "
                    + "code TEXT, "
                    + "name TEXT NOT NULL, "
                    + "address TEXT, "
                    + "lat REAL NOT NULL, "
                    + "lng REAL NOT NULL, "
                    + "solar_kw REAL, "
                    + "storage_kwh REAL, "
                    + "total_bays INTEGER, "
                    + "free_bays INTEGER, "
                    + "bay_kwh REAL, "
                    + "schedule_json TEXT, "
                    + "status TEXT, "
                    + "distance_km REAL, "
                    + "cached_at TEXT NOT NULL)";

    private static final Gson GSON = new Gson();
    private static final Type SCHEDULE_TYPE = new TypeToken<List<StationDto.OpeningHoursDto>>() { }.getType();

    private final SolarGridDbHelper helper;

    /** Needs the database helper. */
    public StationDao(SolarGridDbHelper helper) {
        this.helper = helper;
    }

    /** Saves or refreshes the given stations in one go. */
    public void saveAll(List<StationDto> stations) {
        SQLiteDatabase db = helper.getWritableDatabase();
        db.beginTransaction();
        try {
            String now = Times.nowIso();
            for (StationDto station : stations) {
                db.insertWithOnConflict(TABLE, null, valuesOf(station, now), SQLiteDatabase.CONFLICT_REPLACE);
            }
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    /** Every saved station, nearest first when the distance is known, then by name. */
    public List<StationDto> findAll() {
        List<StationDto> stations = new ArrayList<>();
        try (Cursor cursor = helper.getReadableDatabase().query(TABLE, null, null, null, null, null,
                "distance_km IS NULL, distance_km, name")) {
            while (cursor.moveToNext()) {
                stations.add(read(cursor));
            }
        }
        return stations;
    }

    /** One saved station, or null when the app has never seen it. */
    @Nullable
    public StationDto find(String id) {
        try (Cursor cursor = helper.getReadableDatabase().query(
                TABLE, null, "id = ?", new String[]{id}, null, null, null)) {
            return cursor.moveToFirst() ? read(cursor) : null;
        }
    }

    /** Turns a station into the columns of one row. */
    private static ContentValues valuesOf(StationDto station, String cachedAt) {
        ContentValues values = new ContentValues();
        values.put("id", station.id);
        values.put("code", station.code);
        values.put("name", station.name);
        values.put("address", station.address);
        values.put("lat", station.latitude);
        values.put("lng", station.longitude);
        values.put("solar_kw", station.solarCapacityKw);
        values.put("storage_kwh", station.storageCapacityKwh);
        values.put("total_bays", station.totalBatterySlots);
        values.put("free_bays", station.availableBatterySlots);
        values.put("bay_kwh", station.bayCapacityKwh);
        values.put("schedule_json", GSON.toJson(station.schedule));
        values.put("status", station.status);
        if (station.distanceKm == null) {
            values.putNull("distance_km");
        } else {
            values.put("distance_km", station.distanceKm);
        }
        values.put("cached_at", cachedAt);
        return values;
    }

    /** Builds a station from the current row. */
    private static StationDto read(Cursor cursor) {
        StationDto station = new StationDto();
        station.id = cursor.getString(cursor.getColumnIndexOrThrow("id"));
        station.code = cursor.getString(cursor.getColumnIndexOrThrow("code"));
        station.name = cursor.getString(cursor.getColumnIndexOrThrow("name"));
        station.address = cursor.getString(cursor.getColumnIndexOrThrow("address"));
        station.latitude = cursor.getDouble(cursor.getColumnIndexOrThrow("lat"));
        station.longitude = cursor.getDouble(cursor.getColumnIndexOrThrow("lng"));
        station.solarCapacityKw = cursor.getDouble(cursor.getColumnIndexOrThrow("solar_kw"));
        station.storageCapacityKwh = cursor.getDouble(cursor.getColumnIndexOrThrow("storage_kwh"));
        station.totalBatterySlots = cursor.getInt(cursor.getColumnIndexOrThrow("total_bays"));
        station.availableBatterySlots = cursor.getInt(cursor.getColumnIndexOrThrow("free_bays"));
        station.bayCapacityKwh = cursor.getDouble(cursor.getColumnIndexOrThrow("bay_kwh"));
        station.status = cursor.getString(cursor.getColumnIndexOrThrow("status"));
        int distance = cursor.getColumnIndexOrThrow("distance_km");
        station.distanceKm = cursor.isNull(distance) ? null : cursor.getDouble(distance);
        String schedule = cursor.getString(cursor.getColumnIndexOrThrow("schedule_json"));
        List<StationDto.OpeningHoursDto> hours = schedule == null ? null : GSON.fromJson(schedule, SCHEDULE_TYPE);
        station.schedule = hours == null ? new ArrayList<>() : hours;
        return station;
    }
}
