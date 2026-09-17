/*
 * File:    CameraScanner.jsx
 * Module:  Operator Check-in
 * Owner:   Ravindu
 * Purpose: Reads a booking QR code with the computer's camera and passes the
 *          text back. Browsers only allow the camera on secure pages
 *          (https:// or http://localhost), so a USB scanner or pasting the
 *          code is always offered as well.
 * Source:  WEB-22 (ZXing browser QR reader), WEB-23 (MDN getUserMedia).
 */
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/browser'
import { CameraOff } from 'lucide-react'
import Alert from '../../components/ui/Alert'
import Select from '../../components/ui/Select'
import Spinner from '../../components/ui/Spinner'

// True when this page may ask for the camera.
function cameraAvailable() {
  return Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia)
}

// Turns a camera error into advice for the operator.
function cameraMessage(error) {
  switch (error?.name) {
    case 'NotAllowedError':
      return 'Camera access was blocked. Allow the camera in the browser address bar, or use a USB scanner.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera was found on this computer. Use a USB scanner or paste the code.'
    case 'NotReadableError':
      return 'The camera is being used by another app. Close that app and try again.'
    default:
      return 'The camera could not be started. Use a USB scanner or paste the code.'
  }
}

// Makes a new <video> element for one camera session.
function createPreview() {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.className = 'size-full object-cover'
  video.setAttribute('aria-label', 'Camera preview')
  return video
}

// Live camera preview that stops as soon as one code is read.
export default function CameraScanner({ onScan }) {
  const previewHostRef = useRef(null)
  const [deviceId, setDeviceId] = useState('')
  const [cameras, setCameras] = useState([])
  const [status, setStatus] = useState('starting')
  const [error, setError] = useState(null)
  const supported = cameraAvailable()

  const handleResult = useEffectEvent((text) => onScan(text))

  useEffect(() => {
    if (!supported) return undefined

    // Each session gets its own <video>. A session that is still starting when it is
    // replaced (camera switch, or React re-running the effect) can then stop safely
    // without clearing the picture of the new session.
    const video = createPreview()
    previewHostRef.current.append(video)

    const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 200 })
    let controls = null
    let finished = false

    // Stops the camera once and only once.
    const stop = () => {
      finished = true
      controls?.stop()
    }

    reader
      .decodeFromVideoDevice(deviceId || undefined, video, (result) => {
        if (!result || finished) return
        stop()
        handleResult(result.getText())
      })
      .then(async (started) => {
        controls = started
        if (finished) {
          started.stop()
          return
        }
        setStatus('scanning')
        // Camera names are only readable after permission was given.
        const devices = await BrowserQRCodeReader.listVideoInputDevices()
        if (!finished) setCameras(devices)
      })
      .catch((cameraError) => {
        if (finished) return
        setError(cameraMessage(cameraError))
        setStatus('failed')
      })

    return () => {
      stop()
      video.remove()
    }
  }, [supported, deviceId])

  if (!supported) {
    return (
      <Alert tone="warning" title="Camera not available on this page">
        Browsers only allow the camera on https:// pages or on http://localhost. Use a USB scanner or paste the code instead.
      </Alert>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-tile bg-ink shadow-clay-pressed">
        <div ref={previewHostRef} className="absolute inset-0" />
        {status === 'scanning' && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-[18%] rounded-tile border-4 border-white/85 shadow-scan-frame" />
        )}
        {status === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
            <Spinner size="lg" />
            <p className="font-heading font-bold">Starting the camera…</p>
          </div>
        )}
        {status === 'failed' && (
          <div className="absolute inset-0 flex items-center justify-center text-white/80">
            <CameraOff aria-hidden="true" className="size-14" />
          </div>
        )}
      </div>

      {error ? (
        <Alert tone="danger">{error}</Alert>
      ) : (
        <p role="status" className="text-center text-sm font-medium text-muted">
          {status === 'scanning' ? 'Hold the QR code inside the frame. It is read automatically.' : 'Waiting for camera permission…'}
        </p>
      )}

      {cameras.length > 1 && (
        <Select
          aria-label="Camera"
          size="sm"
          value={deviceId}
          onChange={(event) => {
            setStatus('starting')
            setDeviceId(event.target.value)
          }}
          options={[
            { value: '', label: 'Default camera' },
            ...cameras.map((camera, index) => ({ value: camera.deviceId, label: camera.label || `Camera ${index + 1}` })),
          ]}
        />
      )}
    </div>
  )
}
