/*
 * File:    BookingList.jsx
 * Module:  Dashboards
 * Owner:   Malith
 * Purpose: Compact booking rows for dashboard cards: time, prosumer,
 *          station, trade type, energy and status.
 */
import { Link } from 'react-router'
import StatusBadge from '../../components/ui/StatusBadge'
import { formatDayKey, formatKwh, formatTime, formatTimeRange, localDateKey } from '../../utils/format'

// "Thu 17" for the booking's Sri Lanka date.
function shortDay(value) {
  return formatDayKey(localDateKey(value)).split(' ').slice(0, 2).join(' ')
}

// List of bookings. `action(booking)` can add a button to a row.
export default function BookingList({ bookings, empty, action, label = 'Bookings' }) {
  if (!bookings?.length) return empty ?? null

  return (
    <ul aria-label={label} className="flex flex-col gap-3">
      {bookings.map((booking) => (
        <li
          key={booking.id}
          className="flex flex-col gap-4 rounded-tile bg-white/80 p-4 shadow-clay-row transition-all duration-200 hover:-translate-y-0.5 sm:flex-row sm:items-center"
        >
          <div className="flex h-16 w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-well font-heading shadow-clay-pressed-sm">
            <span className="text-lg leading-none font-black text-ink">{formatTime(booking.startTime)}</span>
            <span className="mt-1 text-xs font-extrabold tracking-wide whitespace-nowrap text-muted uppercase">
              {shortDay(booking.startTime)}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate font-heading font-extrabold text-ink">{booking.prosumerName}</p>
            <p className="truncate text-sm font-medium text-muted">
              {formatTimeRange(booking.startTime, booking.endTime)} · {booking.stationName}
            </p>
            <Link to={`/reservations/${booking.id}`} className="font-mono text-xs font-bold text-accent hover:underline">
              {booking.referenceNo}
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={booking.tradeType} />
            <span className="font-heading text-sm font-extrabold text-ink">{formatKwh(booking.energyKwh)}</span>
            <StatusBadge status={booking.status} />
          </div>

          {action && <div className="shrink-0">{action(booking)}</div>}
        </li>
      ))}
    </ul>
  )
}
