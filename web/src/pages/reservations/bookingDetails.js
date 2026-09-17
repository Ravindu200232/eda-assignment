/*
 * File:    bookingDetails.js
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: Shared wording for bookings: the list tabs, the booking rules in
 *          words, who did something, and the booking's timeline. The rules
 *          themselves are checked by the API; these helpers only describe them.
 */
import { bookingStatus, formatKwh } from '../../utils/format'

export const BOOKING_RULES = 'Bookings: up to 7 days ahead · changes and cancellations: at least 12 hours before the start'

// List tabs. `value` is kept in the address (?tab=pending); `scope` goes to the API.
export const BOOKING_TABS = [
  { value: 'pending', label: 'Pending approval', scope: 'Pending' },
  { value: 'current', label: 'Current', scope: 'Current' },
  { value: 'history', label: 'History', scope: 'History' },
  { value: 'all', label: 'All', scope: undefined },
]

export const BOOKING_STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled', 'Completed']

export const TRADE_TYPES = [
  { value: 'Export', label: 'Export', description: 'The prosumer sends surplus solar energy into the station battery.' },
  { value: 'Import', label: 'Import', description: 'The prosumer takes stored energy from the station battery.' },
]

// The tab for an address value; unknown values fall back to "Pending approval".
export function tabFor(value) {
  return BOOKING_TABS.find((tab) => tab.value === value) ?? BOOKING_TABS[0]
}

// True while staff can still approve or reject the booking.
export function canDecide(booking) {
  return booking.status === 'Pending' && !booking.isPast
}

// "the prosumer (app)" or "staff member 199023456789" for a NIC saved on the booking.
export function actorLabel(nic, booking) {
  if (!nic) return 'unknown'
  return nic === booking.prosumerNic ? 'the prosumer (app)' : `staff member ${nic}`
}

// Events of a booking in time order: [{ key, title, at, detail, tone, done }].
// `now` is a time in milliseconds (taken when the booking was loaded).
export function timelineOf(booking, now) {
  const events = [
    { key: 'booked', title: 'Booked', at: booking.createdAt, detail: `By ${actorLabel(booking.createdBy, booking)}`, tone: 'violet' },
  ]
  const live = booking.status === 'Pending' || booking.status === 'Approved'

  if (booking.approvedAt) {
    events.push({ key: 'approved', title: 'Approved', at: booking.approvedAt, detail: `By ${actorLabel(booking.approvedBy, booking)} · QR code issued`, tone: 'emerald' })
  }
  if (booking.rejectedAt) {
    events.push({ key: 'rejected', title: 'Rejected', at: booking.rejectedAt, detail: booking.reason ?? 'No reason given', tone: 'pink' })
  }
  if (booking.cancelledAt) {
    const reason = booking.reason ? ` · ${booking.reason}` : ''
    events.push({ key: 'cancelled', title: 'Cancelled', at: booking.cancelledAt, detail: `By ${actorLabel(booking.cancelledBy, booking)}${reason}`, tone: 'pink' })
  }
  if (live && !booking.isPast) {
    events.push({ key: 'deadline', title: 'Changes close', at: booking.modifyDeadline, detail: 'Last moment to change or cancel (12 hours before the start)', tone: 'amber' })
  }
  if (live || booking.status === 'Completed') {
    events.push({ key: 'slot', title: 'Energy transfer starts', at: booking.startTime, detail: `At ${booking.stationName}`, tone: 'sky' })
  }
  if (booking.completedAt) {
    events.push({ key: 'completed', title: 'Completed', at: booking.completedAt, detail: `${formatKwh(booking.deliveredKwh)} delivered`, tone: 'emerald' })
  }
  if (bookingStatus(booking) === 'Missed') {
    events.push({ key: 'missed', title: 'Missed', at: booking.endTime, detail: 'The slot ended without a check-in', tone: 'pink' })
  }

  return events
    .filter((event) => event.at)
    .map((event) => ({ ...event, done: Date.parse(event.at) <= now }))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
}
