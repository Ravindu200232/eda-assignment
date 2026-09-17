/*
 * File:    schedule.test.js
 * Module:  Microgrid Stations - unit tests
 * Owner:   Nimthara
 * Purpose: Checks the opening-hours helpers and the day grouping of slots.
 */
import { describe, expect, it } from 'vitest'
import {
  HALF_HOURS,
  describeHours,
  groupSlotsByDay,
  hoursFor,
  rowProblem,
  rowsToSchedule,
  scheduleToRows,
  todayName,
  toMinutes,
} from './schedule'

describe('opening hours helpers', () => {
  it('offers every half hour from 00:00 to 24:00', () => {
    expect(HALF_HOURS[0]).toBe('00:00')
    expect(HALF_HOURS[13]).toBe('06:30')
    expect(HALF_HOURS.at(-1)).toBe('24:00')
    expect(toMinutes('24:00')).toBe(1440)
  })

  it('gives a new station the default hours on every day', () => {
    const rows = scheduleToRows()
    expect(rows).toHaveLength(7)
    expect(rows[0]).toEqual({ day: 'Monday', open: true, openTime: '06:00', closeTime: '18:00' })
    expect(rows[6].day).toBe('Sunday')
  })

  it('marks days without hours as closed and sends only open days', () => {
    const rows = scheduleToRows([
      { day: 'Monday', openTime: '07:00', closeTime: '19:00' },
      { day: 'Sunday', openTime: '00:00', closeTime: '24:00' },
    ])
    expect(rows.filter((row) => row.open).map((row) => row.day)).toEqual(['Monday', 'Sunday'])
    expect(rows[1]).toMatchObject({ day: 'Tuesday', open: false })

    expect(rowsToSchedule(rows)).toEqual([
      { day: 'Monday', openTime: '07:00', closeTime: '19:00' },
      { day: 'Sunday', openTime: '00:00', closeTime: '24:00' },
    ])
  })

  it('explains impossible times', () => {
    expect(rowProblem({ open: true, openTime: '10:00', closeTime: '10:15' })).toMatch(/at least 30 minutes/)
    expect(rowProblem({ open: true, openTime: '18:00', closeTime: '06:00' })).toMatch(/at least 30 minutes/)
    expect(rowProblem({ open: true, openTime: '23:30', closeTime: '24:00' })).toBeNull()
    expect(rowProblem({ open: false, openTime: '10:00', closeTime: '09:00' })).toBeNull()
  })

  it('describes the hours of a day', () => {
    const station = { schedule: [{ day: 'Monday', openTime: '00:00', closeTime: '24:00' }, { day: 'Friday', openTime: '06:00', closeTime: '18:00' }] }
    expect(describeHours(hoursFor(station, 'Monday'))).toBe('Open 24 hours')
    expect(describeHours(hoursFor(station, 'Friday'))).toBe('06:00 – 18:00')
    expect(describeHours(hoursFor(station, 'Sunday'))).toBe('Closed')
  })

  it('uses the Sri Lanka weekday', () => {
    // 19:00 UTC on Wednesday is 00:30 on Thursday in Sri Lanka.
    expect(todayName(new Date('2026-09-16T19:00:00Z'))).toBe('Thursday')
  })
})

describe('slot grouping', () => {
  it('groups slots by Sri Lanka date in time order', () => {
    const days = groupSlotsByDay([
      { id: 'late', startTime: '2026-09-18T02:30:00Z' },
      { id: 'night', startTime: '2026-09-17T19:00:00Z' },
      { id: 'early', startTime: '2026-09-17T00:30:00Z' },
    ])

    expect(days.map((day) => day.key)).toEqual(['2026-09-17', '2026-09-18'])
    expect(days[0].slots.map((slot) => slot.id)).toEqual(['early'])
    expect(days[1].slots.map((slot) => slot.id)).toEqual(['night', 'late'])
    expect(days[1].label).toMatch(/^Fri,? 18 Sept? 2026$/)
  })
})
