/*
 * File:    QrCodeCard.jsx
 * Module:  Energy Reservations (QR codes)
 * Owner:   Hamnad
 * Purpose: The QR code of an approved booking, for the prosumer to show at
 *          the station. Staff can print it as a booking slip or copy the code
 *          text (the check-in page accepts pasted codes).
 * Source:  WEB-17 (qrcode.react), WEB-21 (printing), WEB-32 (Clipboard API).
 */
import { Copy, Printer, QrCode, RefreshCw } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { getReservationQr } from '../../api/reservations'
import { useToast } from '../../context/ToastContext'
import { useApi } from '../../hooks/useApi'
import { formatSlot } from '../../utils/format'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Skeleton from '../ui/Skeleton'

// QR card for one booking. It loads the signed code text from the API.
export default function QrCodeCard({ reservationId, className }) {
  const toast = useToast()
  const qr = useApi(() => getReservationQr(reservationId), [reservationId])

  // Copies the code text for pasting on the check-in page.
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(qr.data.payload)
      toast.success('QR code text copied. It can be pasted on the check-in page.')
    } catch {
      toast.error('This browser did not allow copying. Select the text by hand instead.')
    }
  }

  return (
    <Card
      title="Booking QR code"
      description="The prosumer shows this at the station."
      icon={QrCode}
      iconColor="violet"
      className={className}
    >
      {qr.error ? (
        <Alert
          tone="danger"
          title="Could not load the QR code"
          action={
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={qr.reload}>
              Try again
            </Button>
          }
        >
          {qr.error}
        </Alert>
      ) : !qr.data ? (
        <Skeleton className="mx-auto aspect-square w-56" />
      ) : (
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="rounded-tile bg-white p-4 shadow-clay-pressed">
            <QRCodeSVG
              value={qr.data.payload}
              size={224}
              level="M"
              marginSize={1}
              title={`QR code for ${qr.data.referenceNo}`}
              role="img"
              aria-label={`QR code for ${qr.data.referenceNo}`}
            />
          </div>
          <div>
            <p className="font-mono text-xl font-black text-ink">{qr.data.referenceNo}</p>
            <p className="text-sm font-medium text-muted">{qr.data.stationName}</p>
            <p className="text-sm font-semibold text-ink">{formatSlot(qr.data.startTime, qr.data.endTime)}</p>
            <p className="mt-2 text-xs font-medium text-muted">Changing or cancelling the booking makes this code stop working.</p>
          </div>
          <div className="no-print flex flex-wrap justify-center gap-2">
            <Button size="sm" icon={Printer} onClick={() => window.print()}>
              Print slip
            </Button>
            <Button size="sm" variant="secondary" icon={Copy} onClick={copyCode}>
              Copy code text
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
