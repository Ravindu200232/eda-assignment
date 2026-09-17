/*
 * File:    DecisionButtons.jsx
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: Approve and Reject for a pending booking, with their confirmation
 *          dialogs. Used in the booking list (small icon buttons) and on the
 *          booking page (full buttons). Approving issues the QR code; a
 *          rejection needs a reason the prosumer can read.
 */
import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { getErrorMessage } from '../../api/client'
import { approveReservation, rejectReservation } from '../../api/reservations'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import IconButton from '../../components/ui/IconButton'
import { useToast } from '../../context/ToastContext'
import { formatSlot } from '../../utils/format'

const DIALOGS = {
  approve: {
    title: 'Approve this booking?',
    confirm: 'Approve',
    tone: 'primary',
    note: 'The prosumer gets a QR code to show at the station.',
  },
  reject: {
    title: 'Reject this booking?',
    confirm: 'Reject booking',
    tone: 'danger',
    note: 'The battery bay is freed for other prosumers.',
  },
}

// Two buttons plus dialogs. `onDone` receives the updated booking.
export default function DecisionButtons({ booking, onDone, compact = false }) {
  const toast = useToast()
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const dialog = open ? DIALOGS[open] : null

  // Opens one of the dialogs.
  function ask(action) {
    setError(null)
    setOpen(action)
  }

  // Sends the decision to the API.
  async function decide(reason) {
    setBusy(true)
    setError(null)
    try {
      const updated = open === 'approve' ? await approveReservation(booking.id) : await rejectReservation(booking.id, reason)
      toast.success(
        open === 'approve'
          ? `${updated.referenceNo} is approved. The QR code is ready.`
          : `${updated.referenceNo} was rejected.`,
      )
      setOpen(null)
      onDone(updated)
    } catch (decideError) {
      setError(getErrorMessage(decideError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {compact ? (
        <>
          <IconButton icon={Check} label={`Approve ${booking.referenceNo}`} variant="secondary" onClick={() => ask('approve')} />
          <IconButton icon={X} label={`Reject ${booking.referenceNo}`} variant="danger" onClick={() => ask('reject')} />
        </>
      ) : (
        <>
          <Button size="sm" icon={Check} onClick={() => ask('approve')}>
            Approve
          </Button>
          <Button size="sm" variant="outline" icon={X} onClick={() => ask('reject')}>
            Reject
          </Button>
        </>
      )}

      <ConfirmDialog
        open={dialog !== null}
        title={dialog?.title}
        message={
          dialog && (
            <>
              <strong className="font-mono text-ink">{booking.referenceNo}</strong> · {booking.prosumerName} at {booking.stationName},{' '}
              {formatSlot(booking.startTime, booking.endTime)}. {dialog.note}
            </>
          )
        }
        confirmLabel={dialog?.confirm}
        tone={dialog?.tone}
        reasonLabel={open === 'reject' ? 'Reason for the prosumer' : undefined}
        reasonRequired={open === 'reject'}
        reasonHint={open === 'reject' ? 'For example "Battery bank reserved for grid balancing".' : undefined}
        busy={busy}
        error={error}
        onConfirm={decide}
        onClose={() => setOpen(null)}
      />
    </>
  )
}
