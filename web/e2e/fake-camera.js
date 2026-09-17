/*
 * File:    fake-camera.js
 * Module:  End-to-end tests
 * Owner:   Ravindu
 * Purpose: Makes a short video file that shows a QR code. Chromium can play
 *          it as a pretend webcam, so the camera check-in can be tested
 *          without a real camera.
 * Source:  WEB-24 (Chromium fake media capture flags), WEB-22 (ZXing QR writer).
 */
import { writeFileSync } from 'node:fs'
import { BarcodeFormat, EncodeHintType, QRCodeWriter } from '@zxing/library'

const WIDTH = 640
const HEIGHT = 480
const QR_SIZE = 360
const FRAMES = 10

// Writes a Y4M video (raw YUV 4:2:0) with the QR code in the middle.
export function writeQrVideo(text, filePath) {
  const matrix = new QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, QR_SIZE, QR_SIZE, new Map([[EncodeHintType.MARGIN, 2]]))
  const left = Math.floor((WIDTH - QR_SIZE) / 2)
  const top = Math.floor((HEIGHT - QR_SIZE) / 2)

  // Brightness plane: white page, black QR modules.
  const luma = Buffer.alloc(WIDTH * HEIGHT, 235)
  for (let y = 0; y < QR_SIZE; y++) {
    for (let x = 0; x < QR_SIZE; x++) {
      if (matrix.get(x, y)) luma[(top + y) * WIDTH + left + x] = 16
    }
  }
  // Colour planes stay neutral (grey scale picture).
  const chroma = Buffer.alloc((WIDTH / 2) * (HEIGHT / 2), 128)

  const header = Buffer.from(`YUV4MPEG2 W${WIDTH} H${HEIGHT} F10:1 Ip A1:1 C420jpeg\n`, 'ascii')
  const frame = Buffer.concat([Buffer.from('FRAME\n', 'ascii'), luma, chroma, chroma])
  writeFileSync(filePath, Buffer.concat([header, ...Array(FRAMES).fill(frame)]))
  return filePath
}
