/*
 * File:    format.js
 * Module:  Core utilities
 * Owner:   Ravindu
 * Purpose: Formats dates, times, energy values and labels for display.
 *          Times always show Sri Lanka time, whatever time zone the computer uses.
 * Source:  WEB-10 (Intl.DateTimeFormat with a time zone).
 */

export const TIME_ZONE = 'Asia/Colombo'
const LOCALE = 'en-GB'
const DAY_MS = 24 * 60 * 60 * 1000

const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const timeFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
// The en-CA locale writes dates as YYYY-MM-DD, the format the API expects.
const dayKeyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const dayChipFormat = new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })
const numberFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 })

// Turns an API value into a Date, or null when it is empty or invalid.
function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

// "17 Sept 2026, 08:00"
export function formatDateTime(value) {
  const date = toDate(value)
  return date ? dateTimeFormat.format(date) : '—'
}

// "Thu, 17 Sept 2026"
export function formatDate(value) {
  const date = toDate(value)
  return date ? dateFormat.format(date) : '—'
}

// "08:00"
export function formatTime(value) {
  const date = toDate(value)
  return date ? timeFormat.format(date) : '—'
}

// "08:00 – 10:00"
export function formatTimeRange(start, end) {
  return `${formatTime(start)} – ${formatTime(end)}`
}

// "Thu, 17 Sept 2026 · 08:00 – 10:00"
export function formatSlot(start, end) {
  return `${formatDate(start)} · ${formatTimeRange(start, end)}`
}

// Sri Lanka calendar date of a moment, as "YYYY-MM-DD".
export function localDateKey(value = new Date()) {
  const date = toDate(value)
  return date ? dayKeyFormat.format(date) : ''
}

// The next `count` Sri Lanka dates starting today, as "YYYY-MM-DD" strings.
export function nextLocalDates(count, from = new Date()) {
  const [year, month, day] = localDateKey(from).split('-').map(Number)
  const start = Date.UTC(year, month - 1, day)
  return Array.from({ length: count }, (_, index) => new Date(start + index * DAY_MS).toISOString().slice(0, 10))
}

// "Thu 17 Sept" for a "YYYY-MM-DD" date string.
export function formatDayKey(key) {
  return key ? dayChipFormat.format(new Date(`${key}T00:00:00Z`)).replace(',', '') : '—'
}

// "12.5"
export function formatNumber(value) {
  return value == null || Number.isNaN(Number(value)) ? '—' : numberFormat.format(Number(value))
}

// "12.5 kWh"
export function formatKwh(value) {
  return value == null ? '—' : `${formatNumber(value)} kWh`
}

// "150 kW"
export function formatKw(value) {
  return value == null ? '—' : `${formatNumber(value)} kW`
}

// Splits enum words for display: "GridOperator" -> "Grid Operator".
export function formatLabel(value) {
  return value ? String(value).replace(/([a-z])([A-Z])/g, '$1 $2') : '—'
}

// Up to two initials for an avatar: "Kasun Perera" -> "KP".
export function initials(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2)
  return letters.toUpperCase()
}
