/*
 * File:    QrImages.java
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: Draws the signed booking text from the API as a QR code picture.
 *          The phone never makes up the text itself; it only draws what the
 *          API signed, and the operator's scanner reads it back.
 * Source:  AND-32 (ZXing QR code encoder).
 */
package lk.sliit.solargrid.ui.booking;

import android.graphics.Bitmap;

import androidx.annotation.Nullable;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import com.journeyapps.barcodescanner.BarcodeEncoder;

import java.util.EnumMap;
import java.util.Map;

public final class QrImages {

    /** Nobody builds this class; it is only a helper. */
    private QrImages() {
    }

    /**
     * A square QR picture of the text, or null when it cannot be drawn. A
     * medium error correction level still scans when the screen is scratched
     * or a little dirty.
     */
    @Nullable
    public static Bitmap draw(String text, int sizePixels) {
        Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
        hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
        hints.put(EncodeHintType.MARGIN, 1);
        try {
            return new BarcodeEncoder().encodeBitmap(text, BarcodeFormat.QR_CODE, sizePixels, sizePixels, hints);
        } catch (WriterException | IllegalArgumentException problem) {
            return null;
        }
    }
}
