/*
 * File:    ScheduleEditor.jsx
 * Module:  Microgrid Stations
 * Owner:   Nimthara
 * Purpose: Weekly opening hours editor: one row per day with an open/closed
 *          switch and opening and closing times, plus quick presets.
 */
import { Copy } from 'lucide-react'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import Switch from '../../components/ui/Switch'
import { ALL_DAY, DEFAULT_HOURS, HALF_HOURS, rowProblem } from './schedule'

const OPEN_TIMES = HALF_HOURS.filter((time) => time !== '24:00')
const CLOSE_TIMES = HALF_HOURS.filter((time) => time !== '00:00')

// Time choices that always include the current value.
function timeOptions(times, value) {
  const list = times.includes(value) ? times : [...times, value].sort()
  return list.map((time) => ({ value: time, label: time === '24:00' ? '24:00 (midnight)' : time }))
}

// Editor for seven rows made by scheduleToRows().
export default function ScheduleEditor({ rows, onChange, disabled = false }) {
  // Changes one day.
  function update(day, changes) {
    onChange(rows.map((row) => (row.day === day ? { ...row, ...changes } : row)))
  }

  // Gives every day the same hours.
  function applyToAll(changes) {
    onChange(rows.map((row) => ({ ...row, ...changes })))
  }

  const [monday] = rows

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" disabled={disabled} onClick={() => applyToAll({ open: true, ...DEFAULT_HOURS })}>
          06:00 – 18:00 every day
        </Button>
        <Button variant="secondary" size="sm" disabled={disabled} onClick={() => applyToAll({ open: true, ...ALL_DAY })}>
          Open 24 hours
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={Copy}
          disabled={disabled}
          onClick={() => applyToAll({ open: monday.open, openTime: monday.openTime, closeTime: monday.closeTime })}
        >
          Copy Monday to all days
        </Button>
      </div>

      <ul aria-label="Opening hours" className="flex flex-col gap-2">
        {rows.map((row) => {
          const problem = rowProblem(row)
          return (
            <li key={row.day} className="rounded-tile bg-well/70 px-4 py-3">
              <div className="grid items-center gap-3 sm:grid-cols-[7.5rem_9rem_1fr_1fr]">
                <span className="font-heading font-extrabold text-ink">{row.day}</span>
                <Switch
                  checked={row.open}
                  label={`Open on ${row.day}`}
                  onText="Open"
                  offText="Closed"
                  disabled={disabled}
                  onChange={(open) => update(row.day, { open })}
                />
                <Select
                  size="sm"
                  aria-label={`${row.day} opening time`}
                  options={timeOptions(OPEN_TIMES, row.openTime)}
                  value={row.openTime}
                  disabled={disabled || !row.open}
                  onChange={(event) => update(row.day, { openTime: event.target.value })}
                />
                <Select
                  size="sm"
                  aria-label={`${row.day} closing time`}
                  options={timeOptions(CLOSE_TIMES, row.closeTime)}
                  value={row.closeTime}
                  disabled={disabled || !row.open}
                  onChange={(event) => update(row.day, { closeTime: event.target.value })}
                />
              </div>
              {problem && <p className="mt-2 text-sm font-semibold text-pink-700">{problem}</p>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
