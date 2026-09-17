/*
 * File:    schedule.js
 * Module:  Microgrid Stations
 * Owner:   Nimthara
 * Purpose: Helpers for weekly opening hours (day order, time choices, editor
 *          rows) and for showing slot lists day by day.
 */
import { TIME_ZONE, formatDate, localDateKey } from '../../utils/format'

// Monday first. The names are the ones the API uses.
export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const DEFAULT_HOURS = { openTime: '06:00', closeTime: '18:00' }
export const ALL_DAY = { openTime: '00:00', closeTime: '24:00' }

// Every half hour from 00:00 to 24:00 ("24:00" is midnight at the end of the day).
export const HALF_HOURS = Array.from({ length: 49 }, (_, index) => {
  const hours = String(Math.floor(index / 2)).padStart(2, '0')
  return `${hours}:${index % 2 ? '30' : '00'}`
})

const weekdayFormat = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, weekday: 'long' })

// Minutes since midnight for "HH:mm".
export function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

// Today's weekday in Sri Lanka, e.g. "Thursday".
export function todayName(now = new Date()) {
  return weekdayFormat.format(now)
}

// The opening hours of a station on one day, or null when it is closed.
export function hoursFor(station, day) {
  return station.schedule?.find((entry) => entry.day === day) ?? null
}

// "06:00 – 18:00", "Open 24 hours" or "Closed".
export function describeHours(entry) {
  if (!entry) return 'Closed'
  if (entry.openTime === ALL_DAY.openTime && entry.closeTime === ALL_DAY.closeTime) return 'Open 24 hours'
  return `${entry.openTime} – ${entry.closeTime}`
}

// Seven editor rows. Without a schedule (a new station) every day gets the default hours.
export function scheduleToRows(schedule) {
  return WEEK_DAYS.map((day) => {
    const entry = schedule?.find((item) => item.day === day)
    if (entry) return { day, open: true, openTime: entry.openTime, closeTime: entry.closeTime }
    return { day, open: !schedule, ...DEFAULT_HOURS }
  })
}

// The schedule as the API expects it: open days only.
export function rowsToSchedule(rows) {
  return rows.filter((row) => row.open).map(({ day, openTime, closeTime }) => ({ day, openTime, closeTime }))
}

// A short hint when a day's times cannot work. The API checks the same rule.
export function rowProblem(row) {
  if (!row.open) return null
  return toMinutes(row.closeTime) - toMinutes(row.openTime) < 30
    ? 'Closing time must be at least 30 minutes after opening time.'
    : null
}

// Groups slots by their Sri Lanka date, earliest first.
export function groupSlotsByDay(slots) {
  const days = new Map()
  const sorted = [...slots].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
  for (const slot of sorted) {
    const key = localDateKey(slot.startTime)
    if (!days.has(key)) days.set(key, { key, label: formatDate(slot.startTime), slots: [] })
    days.get(key).slots.push(slot)
  }
  return [...days.values()]
}
