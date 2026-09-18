/*
 * File:    ReservationDao.java
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: Keeps the bookings the prosumer last looked at in SQLite, so the
 *          lists and the booking page still show without a connection. It is a
 *          read-only copy: every change goes through the API first. The rows
 *          belong to one user and are removed at logout.
 * Source:  AND-09 (Android SQLiteOpenHelper and ContentValues).
 */
package lk.sliit.solargrid.data.local;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;

import androidx.annotation.Nullable;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import lk.sliit.solargrid.data.remote.dto.ReservationDto;
import lk.sliit.solargrid.util.Times;

public class ReservationDao {

    public static final String TABLE = "reservations";

    static final String CREATE_TABLE =
            "CREATE TABLE IF NOT EXISTS " + TABLE + " ("
                    + "id TEXT PRIMARY KEY, "
                    + "reference_no TEXT, "
                    + "prosumer_nic TEXT, "
                    + "prosumer_name TEXT, "
                    + "station_id TEXT, "
                    + "station_name TEXT, "
                    + "slot_id TEXT, "
                    + "start_utc TEXT NOT NULL, "
                    + "end_utc TEXT NOT NULL, "
                    + "trade_type TEXT, "
                    + "energy_kwh REAL, "
                    + "delivered_kwh REAL, "
                    + "status TEXT NOT NULL, "
                    + "reason TEXT, "
                    + "can_modify INTEGER, "
                    + "modify_deadline TEXT, "
                    + "is_past INTEGER, "
                    + "has_qr INTEGER, "
                    + "created_by TEXT, "
                    + "created_at TEXT, "
                    + "approved_at TEXT, "
                    + "rejected_at TEXT, "
                    + "cancelled_by TEXT, "
                    + "cancelled_at TEXT, "
                    + "completed_at TEXT, "
                    + "cached_at TEXT NOT NULL)";

    private final SolarGridDbHelper helper;

    /** Needs the database helper. */
    public ReservationDao(SolarGridDbHelper helper) {
        this.helper = helper;
    }

    /** Saves or refreshes the given bookings in one go. */
    public void saveAll(List<ReservationDto> bookings) {
        SQLiteDatabase db = helper.getWritableDatabase();
        db.beginTransaction();
        try {
            String now = Times.nowIso();
            for (ReservationDto booking : bookings) {
                db.insertWithOnConflict(TABLE, null, valuesOf(booking, now), SQLiteDatabase.CONFLICT_REPLACE);
            }
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    /** Every saved booking, the soonest slot first. */
    public List<ReservationDto> findAll() {
        List<ReservationDto> bookings = new ArrayList<>();
        try (Cursor cursor = helper.getReadableDatabase().query(TABLE, null, null, null, null, null, "start_utc")) {
            while (cursor.moveToNext()) {
                bookings.add(read(cursor));
            }
        }
        return bookings;
    }

    /** One saved booking, or null when the phone has never seen it. */
    @Nullable
    public ReservationDto find(String id) {
        try (Cursor cursor = helper.getReadableDatabase().query(
                TABLE, null, "id = ?", new String[]{id}, null, null, null)) {
            return cursor.moveToFirst() ? read(cursor) : null;
        }
    }

    /** Turns a booking into the columns of one row. */
    private static ContentValues valuesOf(ReservationDto booking, String cachedAt) {
        ContentValues values = new ContentValues();
        values.put("id", booking.id);
        values.put("reference_no", booking.referenceNo);
        values.put("prosumer_nic", booking.prosumerNic);
        values.put("prosumer_name", booking.prosumerName);
        values.put("station_id", booking.stationId);
        values.put("station_name", booking.stationName);
        values.put("slot_id", booking.slotId);
        values.put("start_utc", booking.startTime);
        values.put("end_utc", booking.endTime);
        values.put("trade_type", booking.tradeType);
        values.put("energy_kwh", booking.energyKwh);
        if (booking.deliveredKwh == null) {
            values.putNull("delivered_kwh");
        } else {
            values.put("delivered_kwh", booking.deliveredKwh);
        }
        values.put("status", booking.status);
        values.put("reason", booking.reason);
        values.put("can_modify", booking.canModify ? 1 : 0);
        values.put("modify_deadline", booking.modifyDeadline);
        values.put("is_past", booking.isPast ? 1 : 0);
        values.put("has_qr", booking.hasQrCode ? 1 : 0);
        values.put("created_by", booking.createdBy);
        values.put("created_at", booking.createdAt);
        values.put("approved_at", booking.approvedAt);
        values.put("rejected_at", booking.rejectedAt);
        values.put("cancelled_by", booking.cancelledBy);
        values.put("cancelled_at", booking.cancelledAt);
        values.put("completed_at", booking.completedAt);
        values.put("cached_at", cachedAt);
        return values;
    }

    /** Builds a booking from the current row. */
    private static ReservationDto read(Cursor cursor) {
        ReservationDto booking = new ReservationDto();
        booking.id = text(cursor, "id");
        booking.referenceNo = text(cursor, "reference_no");
        booking.prosumerNic = text(cursor, "prosumer_nic");
        booking.prosumerName = text(cursor, "prosumer_name");
        booking.stationId = text(cursor, "station_id");
        booking.stationName = text(cursor, "station_name");
        booking.slotId = text(cursor, "slot_id");
        booking.startTime = text(cursor, "start_utc");
        booking.endTime = text(cursor, "end_utc");
        booking.tradeType = text(cursor, "trade_type");
        booking.energyKwh = cursor.getDouble(cursor.getColumnIndexOrThrow("energy_kwh"));
        int delivered = cursor.getColumnIndexOrThrow("delivered_kwh");
        booking.deliveredKwh = cursor.isNull(delivered) ? null : cursor.getDouble(delivered);
        booking.status = text(cursor, "status");
        booking.reason = text(cursor, "reason");
        // A copy on the phone never allows a change: the API must decide that again.
        booking.canModify = false;
        booking.modifyDeadline = text(cursor, "modify_deadline");
        // A slot that has ended since the copy was saved is past now, whatever the copy says.
        Instant end = Times.toInstant(booking.endTime);
        booking.isPast = cursor.getInt(cursor.getColumnIndexOrThrow("is_past")) == 1
                || (end != null && !end.isAfter(Instant.now()));
        booking.hasQrCode = cursor.getInt(cursor.getColumnIndexOrThrow("has_qr")) == 1;
        booking.createdBy = text(cursor, "created_by");
        booking.createdAt = text(cursor, "created_at");
        booking.approvedAt = text(cursor, "approved_at");
        booking.rejectedAt = text(cursor, "rejected_at");
        booking.cancelledBy = text(cursor, "cancelled_by");
        booking.cancelledAt = text(cursor, "cancelled_at");
        booking.completedAt = text(cursor, "completed_at");
        return booking;
    }

    /** Reads one text column of the current row. */
    private static String text(Cursor cursor, String column) {
        int index = cursor.getColumnIndexOrThrow(column);
        return cursor.isNull(index) ? null : cursor.getString(index);
    }
}
