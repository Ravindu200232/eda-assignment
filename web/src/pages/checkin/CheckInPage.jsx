/*
 * File:    CheckInPage.jsx
 * Module:  Operator Check-in
 * Owner:   Ravindu
 * Purpose: Operator check-in at the station desk. The operator reads the
 *          prosumer's QR code with the camera or a USB scanner (or pastes the
 *          text), the API checks that the code is genuine and on time, and the
 *          operator then records the delivered energy to complete the booking.
 */
import { Suspense, lazy, useRef, useState } from 'react'
import { Camera, CircleCheck, Eraser, ScanLine, ShieldCheck, TriangleAlert, Zap } from 'lucide-react'
import { completeTransfer, verifyQrCode } from '../../api/checkin'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import Field from '../../components/ui/Field'
import IconOrb from '../../components/ui/IconOrb'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'
import { PageLoader } from '../../components/ui/Spinner'
import StatusBadge from '../../components/ui/StatusBadge'
import Textarea from '../../components/ui/Textarea'
import { useToast } from '../../context/ToastContext'
import { cn } from '../../utils/cn'
import { formatDateTime, formatKwh, formatSlot, formatTime } from '../../utils/format'

// The camera reader is large, so it is only downloaded when the camera is opened.
const CameraScanner = lazy(() => import('./CameraScanner'))

// QR check-in page.
export default function CheckInPage() {
  const toast = useToast()
  const codeRef = useRef(null)
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState(null)
  const [check, setCheck] = useState(null)
  const [completed, setCompleted] = useState(null)
  const [history, setHistory] = useState([])
  const [cameraOpen, setCameraOpen] = useState(false)

  // Clears the screen for the next prosumer.
  function reset() {
    setCode('')
    setCheck(null)
    setCheckError(null)
    setCompleted(null)
    codeRef.current?.focus()
  }

  // Sends the scanned text to the API for checking.
  async function verify(text) {
    const payload = text.trim()
    setCheckError(null)
    setCheck(null)
    setCompleted(null)

    if (!payload) {
      setCheckError('Scan or paste the QR code first.')
      return
    }

    setChecking(true)
    try {
      const result = await verifyQrCode(payload)
      setCheck({ ...result, payload })
    } catch (error) {
      setCheckError(getErrorMessage(error))
    } finally {
      setChecking(false)
    }
  }

  // Form submit (button or Enter).
  function handleVerify(event) {
    event.preventDefault()
    verify(code)
  }

  // USB scanners finish with Enter, so Enter checks the code (Shift+Enter adds a line).
  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) handleVerify(event)
  }

  // A code read by the camera is shown in the box and checked straight away.
  function handleCameraScan(text) {
    setCameraOpen(false)
    setCode(text)
    verify(text)
  }

  // Called after the transfer was saved by the API.
  function handleCompleted(reservation) {
    setCompleted(reservation)
    setCheck(null)
    setCode('')
    setHistory((list) => [reservation, ...list].slice(0, 5))
    toast.success(`${reservation.referenceNo} completed with ${formatKwh(reservation.deliveredKwh)}.`)
  }

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="QR check-in"
        description="Scan the booking QR code shown in the prosumer's app, or paste its text. Check-in opens 2 hours before the slot starts and closes 1 hour after it ends."
      />

      <div className="grid items-start gap-8 lg:grid-cols-5">
        <div className="flex flex-col gap-8 lg:col-span-2">
          <Card
            title="Scan the code"
            description="Use the camera, or a USB scanner that types the code and presses Enter for you."
            icon={ScanLine}
            iconColor="sky"
          >
            <form noValidate onSubmit={handleVerify} className="flex flex-col gap-5">
              <Field label="QR code text" hint="Codes start with SSG1.">
                <Textarea
                  ref={codeRef}
                  rows={4}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="SSG1.…"
                  spellCheck={false}
                  autoComplete="off"
                  autoFocus
                  className="font-mono text-sm break-all"
                />
              </Field>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" icon={ShieldCheck} loading={checking} className="sm:flex-1">
                  Check code
                </Button>
                <Button variant="ghost" icon={Eraser} onClick={reset} disabled={checking}>
                  Clear
                </Button>
              </div>
              <Button variant="secondary" icon={Camera} onClick={() => setCameraOpen(true)} disabled={checking}>
                Scan with camera
              </Button>
            </form>
          </Card>

          {history.length > 0 && (
            <Card title="Completed this session" padding="md">
              <ul className="flex flex-col gap-3">
                {history.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 rounded-tile bg-well/70 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block font-mono text-sm font-bold text-ink">{item.referenceNo}</span>
                      <span className="block truncate text-sm text-muted">{item.prosumerName}</span>
                    </span>
                    <span className="text-right text-sm font-bold text-ink">
                      {formatKwh(item.deliveredKwh)}
                      <span className="block text-xs font-medium text-muted">{formatTime(item.completedAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="lg:col-span-3">
          {checkError && (
            <Alert tone="danger" title="Code not accepted">
              {checkError}
            </Alert>
          )}
          {completed && <CompletedCard reservation={completed} onNext={reset} />}
          {check && <CheckResult check={check} onCompleted={handleCompleted} onCancel={reset} />}
          {!check && !completed && !checkError && (
            <Card>
              <EmptyState
                icon={ScanLine}
                title="Waiting for a code"
                message="The booking details appear here after the code is checked. Only approved bookings can be completed."
              />
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        title="Scan with camera"
        description="Point the camera at the QR code in the prosumer's app."
      >
        <Suspense fallback={<PageLoader label="Loading the camera reader…" />}>
          <CameraScanner onScan={handleCameraScan} />
        </Suspense>
      </Modal>
    </>
  )
}

// Booking details from the check, with the form to finish the transfer.
function CheckResult({ check, onCompleted, onCancel }) {
  const { reservation } = check
  const [delivered, setDelivered] = useState(String(reservation.energyKwh))
  const [deliveredError, setDeliveredError] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Opens the confirmation once a number was typed.
  function handleSubmit(event) {
    event.preventDefault()
    const value = Number(delivered)
    if (delivered.trim() === '' || Number.isNaN(value)) {
      setDeliveredError('Enter the delivered energy in kWh.')
      return
    }
    setDeliveredError(null)
    setError(null)
    setConfirming(true)
  }

  // Sends the completion. The API checks the code and the energy limit again.
  async function handleConfirm() {
    setBusy(true)
    setError(null)
    try {
      const saved = await completeTransfer(reservation.id, check.payload, Number(delivered))
      setConfirming(false)
      onCompleted(saved)
    } catch (completeError) {
      const fields = getFieldErrors(completeError)
      setError(fields.deliveredKwh ?? getErrorMessage(completeError))
      setBusy(false)
    }
  }

  const rows = [
    { label: 'Reference', value: <span className="font-mono font-bold">{reservation.referenceNo}</span> },
    { label: 'Prosumer', value: `${reservation.prosumerName} (${reservation.prosumerNic})` },
    {
      label: 'Phone',
      value: check.prosumerPhone ? (
        <a href={`tel:${check.prosumerPhone}`} className="font-bold text-accent hover:underline">
          {check.prosumerPhone}
        </a>
      ) : (
        '—'
      ),
    },
    { label: 'Station', value: reservation.stationName },
    { label: 'Slot', value: formatSlot(reservation.startTime, reservation.endTime) },
    {
      label: 'Trade',
      value: (
        <span className="inline-flex items-center gap-2">
          <StatusBadge status={reservation.tradeType} />
          {formatKwh(reservation.energyKwh)}
        </span>
      ),
    },
    { label: 'Status', value: <StatusBadge status={reservation.status} /> },
    { label: 'Check-in window', value: `${formatDateTime(check.checkInOpensAt)} – ${formatTime(check.checkInClosesAt)}` },
  ]

  return (
    <Card padding="none">
      <div
        role="status"
        className={cn(
          'flex items-start gap-4 p-6 sm:p-8',
          check.canComplete ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900',
        )}
      >
        <IconOrb icon={check.canComplete ? CircleCheck : TriangleAlert} color={check.canComplete ? 'emerald' : 'amber'} />
        <div>
          <p className="font-heading text-2xl font-black">{check.canComplete ? 'Ready to transfer' : 'Cannot complete yet'}</p>
          <p className="mt-1 font-medium">{check.message}</p>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="min-w-0">
              <dt className="font-heading text-xs font-extrabold tracking-wide text-muted uppercase">{row.label}</dt>
              <dd className="mt-1 font-medium break-words text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>

        {check.canComplete ? (
          <form noValidate onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4 rounded-tile bg-well/70 p-5 sm:flex-row sm:items-end">
            <Field
              label="Delivered energy (kWh)"
              hint={`Booked: ${formatKwh(reservation.energyKwh)}`}
              error={deliveredError}
              required
              className="sm:flex-1"
            >
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={delivered}
                onChange={(event) => setDelivered(event.target.value)}
              />
            </Field>
            <Button type="submit" icon={Zap} className="sm:mb-7">
              Complete transfer
            </Button>
          </form>
        ) : (
          <div className="mt-8">
            <Button variant="secondary" icon={ScanLine} onClick={onCancel}>
              Scan another code
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        title="Complete this transfer?"
        message={`${reservation.referenceNo} will be marked as completed with ${formatKwh(Number(delivered))} delivered. The QR code can then no longer be used.`}
        confirmLabel="Complete transfer"
        busy={busy}
        error={error}
        onConfirm={handleConfirm}
        onClose={() => setConfirming(false)}
      />
    </Card>
  )
}

// Success message after a completed transfer.
function CompletedCard({ reservation, onNext }) {
  return (
    <Card>
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <IconOrb icon={CircleCheck} color="emerald" size="lg" className="animate-clay-breathe" />
        <h2 className="font-heading text-3xl font-black tracking-tight text-ink">Transfer completed</h2>
        <p className="max-w-md text-lg font-medium text-muted">
          <span className="font-mono font-bold text-ink">{reservation.referenceNo}</span> · {reservation.prosumerName} ·{' '}
          {formatKwh(reservation.deliveredKwh)} {reservation.tradeType === 'Export' ? 'received' : 'delivered'} at{' '}
          {formatTime(reservation.completedAt)}
        </p>
        <Button icon={ScanLine} onClick={onNext} className="mt-2">
          Scan next code
        </Button>
      </div>
    </Card>
  )
}
