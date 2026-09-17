/*
 * File:    bookingDetails.test.js
 * Module:  Energy Reservations - unit tests
 * Owner:   Hamnad
 * Purpose: Checks the list tabs, who-did-it labels and the booking timeline.
 */
import { describe, expect, it } from 'vitest'
import { reservation } from '../../test/reservationSamples'
import { actorLabel, canDecide, tabFor, timelineOf } from './bookingDetails'

const NEW_YEAR = Date.parse('2099-01-01T00:00:00Z')

describe('booking helpers', () => {
  it('finds the tab for an address value', () => {
    expect(tabFor('history')).toMatchObject({ label: 'History', scope: 'History' })
    expect(tabFor('all').scope).toBeUndefined()
    expect(tabFor('something-else').value).toBe('pending')
    expect(tabFor(null).value).toBe('pending')
  })

  it('allows decisions only on pending bookings that have not ended', () => {
    expect(canDecide(reservation({ status: 'Pending' }))).toBe(true)
    expect(canDecide(reservation({ status: 'Pending', isPast: true }))).toBe(false)
    expect(canDecide(reservation({ status: 'Approved' }))).toBe(false)
  })

  it('names who made a change', () => {
    const booking = reservation()
    expect(actorLabel('200034501234', booking)).toBe('the prosumer (app)')
    expect(actorLabel('199023456789', booking)).toBe('staff member 199023456789')
    expect(actorLabel(null, booking)).toBe('unknown')
  })
})

describe('timelineOf', () => {
  it('lists an approved booking with its upcoming deadline and slot', () => {
    const events = timelineOf(reservation(), NEW_YEAR)

    expect(events.map((event) => [event.key, event.done])).toEqual([
      ['booked', true],
      ['approved', true],
      ['deadline', false],
      ['slot', false],
    ])
    expect(events[0].detail).toBe('By the prosumer (app)')
    expect(events[1].detail).toBe('By staff member 199023456789 · QR code issued')
    expect(events[3].detail).toBe('At SLIIT Malabe Campus Microgrid')
  })

  it('ends a cancelled booking with the cancellation and its reason', () => {
    const booking = reservation({
      status: 'Cancelled',
      canModify: false,
      cancelledAt: '2099-01-01T02:00:00Z',
      cancelledBy: '198512345678',
      reason: 'Prosumer is travelling',
    })

    const events = timelineOf(booking, NEW_YEAR)

    expect(events.map((event) => event.key)).toEqual(['booked', 'approved', 'cancelled'])
    expect(events[2]).toMatchObject({ detail: 'By staff member 198512345678 · Prosumer is travelling', done: false })
  })

  it('shows the delivered energy of a completed booking', () => {
    const booking = reservation({ status: 'Completed', completedAt: '2099-01-05T06:30:00Z', deliveredKwh: 9.5, isPast: true })

    const events = timelineOf(booking, Date.parse('2099-01-06T00:00:00Z'))

    expect(events.map((event) => event.key)).toEqual(['booked', 'approved', 'slot', 'completed'])
    expect(events[3].detail).toBe('9.5 kWh delivered')
    expect(events.every((event) => event.done)).toBe(true)
  })

  it('marks an approved booking whose slot ended as missed', () => {
    const booking = reservation({ isPast: true, canModify: false })

    const events = timelineOf(booking, Date.parse('2099-01-06T00:00:00Z'))

    expect(events.map((event) => event.key)).toEqual(['booked', 'approved', 'slot', 'missed'])
    expect(events[3]).toMatchObject({ at: '2099-01-05T06:30:00Z', detail: 'The slot ended without a check-in' })
  })

  it('shows the rejection reason', () => {
    const booking = reservation({
      status: 'Rejected',
      approvedAt: null,
      approvedBy: null,
      rejectedAt: '2098-12-31T06:00:00Z',
      reason: 'Battery bank reserved for grid balancing',
    })

    const events = timelineOf(booking, NEW_YEAR)

    expect(events.map((event) => event.key)).toEqual(['booked', 'rejected'])
    expect(events[1].detail).toBe('Battery bank reserved for grid balancing')
  })
})
