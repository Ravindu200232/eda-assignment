/*
 * File:    ScheduleEditor.test.jsx
 * Module:  Microgrid Stations - unit tests
 * Owner:   Nimthara
 * Purpose: Checks the weekly hours editor: switching days, changing times,
 *          presets and the hint for impossible times.
 */
import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import ScheduleEditor from './ScheduleEditor'
import { rowsToSchedule, scheduleToRows } from './schedule'

// Editor with its own state; prints what would be sent to the API.
function Harness({ schedule }) {
  const [rows, setRows] = useState(() => scheduleToRows(schedule))
  return (
    <>
      <ScheduleEditor rows={rows} onChange={setRows} />
      <output data-testid="schedule">{JSON.stringify(rowsToSchedule(rows))}</output>
    </>
  )
}

const sent = () => JSON.parse(screen.getByTestId('schedule').textContent)

describe('ScheduleEditor', () => {
  it('closes a day and disables its times', async () => {
    render(<Harness />)
    const sunday = screen.getByRole('switch', { name: 'Open on Sunday' })

    await userEvent.click(sunday)

    expect(sunday).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByLabelText('Sunday opening time')).toBeDisabled()
    expect(sent().map((entry) => entry.day)).not.toContain('Sunday')
    expect(sent()).toHaveLength(6)
  })

  it('changes the times of one day', async () => {
    render(<Harness />)

    await userEvent.selectOptions(screen.getByLabelText('Monday opening time'), '07:30')
    await userEvent.selectOptions(screen.getByLabelText('Monday closing time'), '24:00')

    expect(sent()[0]).toEqual({ day: 'Monday', openTime: '07:30', closeTime: '24:00' })
    expect(sent()[1]).toEqual({ day: 'Tuesday', openTime: '06:00', closeTime: '18:00' })
  })

  it('applies the presets to every day', async () => {
    render(<Harness schedule={[{ day: 'Monday', openTime: '08:00', closeTime: '12:00' }]} />)
    expect(sent()).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: 'Copy Monday to all days' }))
    expect(sent()).toHaveLength(7)
    expect(sent().every((entry) => entry.openTime === '08:00' && entry.closeTime === '12:00')).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'Open 24 hours' }))
    expect(sent().every((entry) => entry.openTime === '00:00' && entry.closeTime === '24:00')).toBe(true)
  })

  it('warns when a day closes before it opens', async () => {
    render(<Harness />)

    await userEvent.selectOptions(screen.getByLabelText('Friday closing time'), '05:00')

    const friday = screen.getByRole('list', { name: 'Opening hours' }).children[4]
    expect(within(friday).getByText('Closing time must be at least 30 minutes after opening time.')).toBeInTheDocument()
  })
})
