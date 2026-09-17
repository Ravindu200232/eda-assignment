/*
 * File:    format.test.js
 * Module:  Core utilities - unit tests
 * Owner:   Ravindu
 * Purpose: Checks that dates are shown in Sri Lanka time and that values and
 *          labels are formatted the same way everywhere.
 */
import { describe, expect, it } from 'vitest'
import {
  bookingStatus,
  formatDate,
  formatDateTime,
  formatDayKey,
  formatKw,
  formatKwh,
  formatLabel,
  formatSlot,
  formatTime,
  formatTimeAgo,
  initials,
  localDateKey,
  nextLocalDates,
} from './format'

describe('dates and times (Asia/Colombo)', () => {
  it('shows Sri Lanka time for a UTC value', () => {
    expect(formatTime('2026-09-17T02:30:00Z')).toBe('08:00')
    expect(formatDateTime('2026-09-17T02:30:00Z')).toMatch(/^17 Sept? 2026, 08:00$/)
    expect(formatDate('2026-09-17T02:30:00Z')).toMatch(/^Thu,? 17 Sept? 2026$/)
  })

  it('writes a slot as date and time range', () => {
    expect(formatSlot('2026-09-17T02:30:00Z', '2026-09-17T04:30:00Z')).toMatch(/^Thu,? 17 Sept? 2026 · 08:00 – 10:00$/)
  })

  it('uses the Sri Lanka calendar date just after midnight', () => {
    // 19:00 UTC is 00:30 on the next day in Sri Lanka.
    expect(localDateKey('2026-09-16T19:00:00Z')).toBe('2026-09-17')
  })

  it('lists the next local dates for the 7-day booking window', () => {
    expect(nextLocalDates(7, new Date('2026-09-16T19:00:00Z'))).toEqual([
      '2026-09-17',
      '2026-09-18',
      '2026-09-19',
      '2026-09-20',
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
    ])
    expect(formatDayKey('2026-09-17')).toMatch(/^Thu 17 Sept?$/)
  })

  it('shows a dash for missing or broken values', () => {
    expect(formatDateTime(null)).toBe('—')
    expect(formatTime('not a date')).toBe('—')
    expect(localDateKey(undefined)).toBe(localDateKey(new Date()))
  })
})

describe('relative times (added by Malith)', () => {
  const now = new Date('2026-09-17T06:00:00Z')

  it('says how long ago something happened', () => {
    expect(formatTimeAgo('2026-09-14T06:00:00Z', now)).toBe('3 days ago')
    expect(formatTimeAgo('2026-09-17T04:00:00Z', now)).toBe('2 hours ago')
    expect(formatTimeAgo('2026-09-17T05:55:00Z', now)).toBe('5 minutes ago')
    expect(formatTimeAgo('2026-09-17T05:59:50Z', now)).toBe('this minute')
    expect(formatTimeAgo('2026-09-16T06:00:00Z', now)).toBe('yesterday')
    expect(formatTimeAgo(null, now)).toBe('—')
  })
})

describe('booking status (added by Malith)', () => {
  it('shows ended pending or approved bookings as missed', () => {
    expect(bookingStatus({ status: 'Approved', isPast: true })).toBe('Missed')
    expect(bookingStatus({ status: 'Pending', isPast: true })).toBe('Missed')
    expect(bookingStatus({ status: 'Approved', isPast: false })).toBe('Approved')
    expect(bookingStatus({ status: 'Completed', isPast: true })).toBe('Completed')
    expect(bookingStatus({ status: 'Cancelled', isPast: true })).toBe('Cancelled')
  })
})

describe('numbers and labels', () => {
  it('formats energy and power', () => {
    expect(formatKwh(12.345)).toBe('12.35 kWh')
    expect(formatKwh(null)).toBe('—')
    expect(formatKw(150)).toBe('150 kW')
  })

  it('makes enum values readable', () => {
    expect(formatLabel('GridOperator')).toBe('Grid Operator')
    expect(formatLabel('Approved')).toBe('Approved')
  })

  it('builds avatar initials', () => {
    expect(initials('Kasun Perera')).toBe('KP')
    expect(initials('Nimal Kumara Bandara')).toBe('NB')
    expect(initials('admin')).toBe('AD')
    expect(initials('')).toBe('?')
  })
})
