/*
 * File:    ReservationDetailsPage.jsx
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: One booking: its details, what happened so far (timeline), the
 *          12-hour change deadline, staff actions (approve, reject, change,
 *          cancel for the prosumer) and the QR code once it is approved.
 * Source:  WEB-21 (printing only the QR code card).
 */
import { useState } from 'react'
import { CalendarClock, CalendarX2, CircleX, Clock, History, Pencil, Receipt } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { getErrorMessage } from '../../api/client'
import { cancelReservation, getReservation } from '../../api/reservations'
import QrCodeCard from '../../components/qr/QrCodeCard'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import PageHeader from '../../components/ui/PageHeader'
import { PageLoader } from '../../components/ui/Spinner'
import StatusBadge from '../../components/ui/StatusBadge'
import { useToast } from '../../context/ToastContext'
import { useApi } from '../../hooks/useApi'
import { cn } from '../../utils/cn'
import { bookingStatus, formatDate, formatDateTime, formatKwh, formatTimeRange } from '../../utils/format'
import { TRADE_TYPES, canDecide, timelineOf } from './bookingDetails'
import DecisionButtons from './DecisionButtons'

const DOT_COLOURS = {
  violet: 'bg-violet-500',
  emerald: 'bg-emerald-500',
  pink: 'bg-pink-500',
  amber: 'bg-amber-500',
  sky: 'bg-sky-500',
}

// Loads a booking and notes when, so the page can tell past from future events.
async function loadBooking(id) {
  const booking = await getReservation(id)
  return { ...booking, loadedAt: Date.now() }
}

// Booking details page.
export default function ReservationDetailsPage() {
  const { id } = useParams()
  const toast = useToast()
  const booking = useApi(() => loadBooking(id), [id])
  const [cancelling, setCancelling] = useState(false)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [cancelError, setCancelError] = useState(null)

  // Shows the booking the API sent back after an action.
  function showUpdated(updated) {
    booking.setData({ ...updated, loadedAt: Date.now() })
  }

  // Cancels for the prosumer (the reason is optional).
  async function confirmCancel(reason) {
    setCancelBusy(true)
    setCancelError(null)
    try {
      const updated = await cancelReservation(booking.data.id, reason)
      toast.success(`${updated.referenceNo} was cancelled.`)
      setCancelling(false)
      showUpdated(updated)
    } catch (error) {
      setCancelError(getErrorMessage(error))
    } finally {
      setCancelBusy(false)
    }
  }

  if (booking.loading && !booking.data) return <PageLoader label="Loading booking…" />

  if (!booking.data) {
    return (
      <>
        <PageHeader title="Booking" backTo="/reservations" backLabel="All bookings" />
        <Card>
          <EmptyState
            icon={CalendarX2}
            color="pink"
            title="Booking not found"
            message={booking.error}
            action={<Button to="/reservations">Back to bookings</Button>}
          />
        </Card>
      </>
    )
  }

  const current = booking.data
  const status = bookingStatus(current)
  const trade = TRADE_TYPES.find((type) => type.value === current.tradeType)
  const details = [
    {
      label: 'Prosumer',
      value: (
        <Link to={`/prosumers/${encodeURIComponent(current.prosumerNic)}`} className="text-accent hover:underline">
          {current.prosumerName}
        </Link>
      ),
      extra: current.prosumerNic,
    },
    {
      label: 'Station',
      value: (
        <Link to={`/stations/${current.stationId}`} className="text-accent hover:underline">
          {current.stationName}
        </Link>
      ),
    },
    { label: 'Day', value: formatDate(current.startTime) },
    { label: 'Time', value: formatTimeRange(current.startTime, current.endTime), extra: 'Sri Lanka time' },
    { label: 'Trade', value: <StatusBadge status={current.tradeType} />, extra: trade?.description },
    {
      label: 'Energy',
      value: formatKwh(current.energyKwh),
      extra: current.deliveredKwh != null ? `${formatKwh(current.deliveredKwh)} delivered` : 'Requested amount',
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Booking"
        title={current.referenceNo}
        documentTitle={`Booking ${current.referenceNo}`}
        description={`${current.prosumerName} · ${current.stationName}`}
        backTo="/reservations"
        backLabel="All bookings"
        actions={
          <div className="no-print flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {canDecide(current) && <DecisionButtons booking={current} onDone={showUpdated} />}
            {current.canModify && (
              <>
                <Button to={`/reservations/${current.id}/edit`} variant="secondary" size="sm" icon={Pencil}>
                  Change
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={CircleX}
                  onClick={() => {
                    setCancelError(null)
                    setCancelling(true)
                  }}
                >
                  Cancel booking
                </Button>
              </>
            )}
          </div>
        }
      />

      {status === 'Missed' && (
        <Alert tone="warning" className="no-print mb-6" title="Missed booking">
          The slot has ended and the booking was never completed at the station.
        </Alert>
      )}

      <div className="grid items-start gap-8 xl:grid-cols-3">
        <div className="no-print flex min-w-0 flex-col gap-8 xl:col-span-2">
          <Card
            title="Booking details"
            icon={Receipt}
            iconColor="violet"
            actions={<StatusBadge status={status} className="px-4 py-1.5 text-sm" />}
          >
            <dl className="grid gap-4 sm:grid-cols-2">
              {details.map((item) => (
                <div key={item.label} className="rounded-tile bg-well/70 px-4 py-3">
                  <dt className="font-heading text-xs font-extrabold tracking-wide text-muted uppercase">{item.label}</dt>
                  <dd className="mt-1 font-heading text-lg font-extrabold text-ink">{item.value}</dd>
                  {item.extra && <dd className="text-sm font-medium text-muted">{item.extra}</dd>}
                </div>
              ))}
            </dl>
            {current.reason && (
              <p className="mt-5 rounded-tile bg-pink-50 px-4 py-3 text-sm font-medium text-pink-900">
                <span className="font-heading font-extrabold">Reason: </span>
                {current.reason}
              </p>
            )}
          </Card>

          <Card title="Timeline" icon={History} iconColor="sky">
            <Timeline booking={current} />
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-8">
          <ChangeDeadline booking={current} />
          {current.hasQrCode ? (
            <QrCodeCard reservationId={current.id} />
          ) : (
            current.status === 'Pending' &&
            !current.isPast && (
              <Card title="QR code" icon={CalendarClock} iconColor="amber" className="no-print">
                <p className="text-sm font-medium text-muted">The QR code is created when the booking is approved.</p>
              </Card>
            )
          )}
        </div>
      </div>

      <ConfirmDialog
        open={cancelling}
        title="Cancel this booking?"
        message={`${current.referenceNo} for ${current.prosumerName} will be cancelled and the battery bay freed. This cannot be undone.`}
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        tone="danger"
        reasonLabel="Reason (optional)"
        reasonHint="For example what the prosumer told you."
        busy={cancelBusy}
        error={cancelError}
        onConfirm={confirmCancel}
        onClose={() => setCancelling(false)}
      />
    </>
  )
}

// What happened to the booking, oldest first; future steps are faded.
function Timeline({ booking }) {
  const events = timelineOf(booking, booking.loadedAt)

  return (
    <ol aria-label="Booking timeline" className="relative flex flex-col gap-5 border-l-2 border-well pl-6">
      {events.map((event) => (
        <li key={event.key} className={cn('relative', !event.done && 'opacity-60')}>
          <span
            aria-hidden="true"
            className={cn('absolute top-1.5 -left-[33px] size-4 rounded-full ring-4 ring-white', DOT_COLOURS[event.tone])}
          />
          <p className="font-heading font-extrabold text-ink">
            {event.title}
            {!event.done && <span className="ml-2 text-xs font-bold tracking-wide text-muted uppercase">Upcoming</span>}
          </p>
          <p className="text-sm font-semibold text-ink">{formatDateTime(event.at)}</p>
          <p className="text-sm font-medium text-muted">{event.detail}</p>
        </li>
      ))}
    </ol>
  )
}

// The 12-hour rule for this booking, in words.
function ChangeDeadline({ booking }) {
  const live = booking.status === 'Pending' || booking.status === 'Approved'
  let tone = 'neutral'
  let text = 'This booking is finished, so it can no longer be changed or cancelled.'
  if (booking.canModify) {
    tone = 'open'
    text = `The booking can be changed or cancelled until ${formatDateTime(booking.modifyDeadline)} (12 hours before the start).`
  } else if (live && !booking.isPast) {
    tone = 'closed'
    text = `Changes closed at ${formatDateTime(booking.modifyDeadline)}. Bookings cannot be changed or cancelled in the last 12 hours before the start.`
  }

  return (
    <Card title="Changes" icon={Clock} iconColor={tone === 'open' ? 'emerald' : 'amber'} className="no-print">
      <p
        className={cn(
          'rounded-tile px-4 py-3 text-sm font-semibold',
          tone === 'open' && 'bg-emerald-50 text-emerald-900',
          tone === 'closed' && 'bg-amber-50 text-amber-900',
          tone === 'neutral' && 'bg-well/70 text-muted',
        )}
      >
        {text}
      </p>
    </Card>
  )
}
