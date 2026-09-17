/*
 * File:    SlotsPanel.test.jsx
 * Module:  Energy Slots - unit tests
 * Owner:   Nimthara
 * Purpose: Checks the slot list (one day at a time, locked rows) and the
 *          add, generate, change and delete actions.
 */
import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createSlot, deleteSlot, generateSlots, listSlots, updateSlot } from '../../api/slots'
import { renderPage } from '../../test/render'
import { slot, station } from '../../test/stationSamples'
import SlotsPanel from './SlotsPanel'

vi.mock('../../api/auth', () => ({ login: vi.fn(), getCurrentUser: vi.fn(() => new Promise(() => {})), changePassword: vi.fn() }))
vi.mock('../../api/slots', () => ({
  listSlots: vi.fn(),
  createSlot: vi.fn(),
  generateSlots: vi.fn(),
  updateSlot: vi.fn(),
  deleteSlot: vi.fn(),
}))

const slots = [
  slot({ id: 'booked', startTime: '2099-01-05T02:30:00Z', endTime: '2099-01-05T04:30:00Z', bookedCount: 2, availableBays: 2 }),
  slot({ id: 'free', startTime: '2099-01-05T04:30:00Z', endTime: '2099-01-05T06:30:00Z' }),
  slot({ id: 'closed', startTime: '2099-01-06T02:30:00Z', endTime: '2099-01-06T04:30:00Z', isOpen: false }),
  slot({ id: 'old', startTime: '2020-01-01T02:30:00Z', endTime: '2020-01-01T04:30:00Z' }),
]

// Shows the panel for a station.
async function openPanel(stationData = station()) {
  vi.mocked(listSlots).mockResolvedValue(slots)
  const view = renderPage(<SlotsPanel station={stationData} />)
  await screen.findByRole('region', { name: /5 Jan/ })
  return view
}

// The row of the slot with this time range on 5 January.
const row = (range) => within(screen.getByRole('region', { name: /5 Jan/ })).getByRole('listitem', { name: `Slot ${range}` })

describe('SlotsPanel', () => {
  it('shows one day at a time and locks the finished slots', async () => {
    const { events } = await openPanel()

    // The first day with slots still to come is shown; the finished day stays behind its tab.
    const tabs = within(screen.getByRole('tablist', { name: 'Days with slots' })).getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Wed 1 Jan 1', 'Mon 5 Jan 2', 'Tue 6 Jan 1'])
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByRole('region', { name: /Jan/ })).toHaveLength(1)
    expect(within(row('08:00 – 10:00')).getByText('2 of 4 bays booked · 2 free')).toBeInTheDocument()

    await events.click(tabs[2])
    expect(within(screen.getByRole('region', { name: /6 Jan/ })).getByText('Closed')).toBeInTheDocument()

    await events.click(tabs[0])
    const finished = within(screen.getByRole('region', { name: /1 Jan/ }))
    expect(finished.getByText('Finished')).toBeInTheDocument()
    expect(finished.queryByRole('button')).not.toBeInTheDocument()
  })

  it('does not delete slots that have bookings', async () => {
    vi.mocked(deleteSlot).mockResolvedValue(undefined)
    const { events } = await openPanel()

    expect(within(row('08:00 – 10:00')).getByRole('button', { name: 'Slots with bookings cannot be deleted' })).toBeDisabled()

    await events.click(within(row('10:00 – 12:00')).getByRole('button', { name: 'Delete slot' }))
    await events.click(within(screen.getByRole('dialog', { name: 'Delete this slot?' })).getByRole('button', { name: 'Delete slot' }))

    expect(deleteSlot).toHaveBeenCalledWith('free')
    expect(await screen.findByText('Slot deleted.')).toBeInTheDocument()
    expect(listSlots).toHaveBeenCalledTimes(2)
  })

  it('adds one slot and opens its day', async () => {
    const added = slot({ id: 'new', startTime: '2099-01-07T03:30:00Z', endTime: '2099-01-07T05:30:00Z' })
    vi.mocked(createSlot).mockResolvedValue(added)
    const { events } = await openPanel()
    vi.mocked(listSlots).mockResolvedValue([...slots, added])

    await events.click(screen.getByRole('button', { name: 'Add slot' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a slot' })
    await events.selectOptions(within(dialog).getByLabelText(/^Start time/), '09:00')
    await events.selectOptions(within(dialog).getByLabelText(/^End time/), '11:00')
    await events.type(within(dialog).getByLabelText(/^Bays in this slot/), '3')
    await events.click(within(dialog).getByRole('button', { name: 'Add slot' }))

    const [stationId, sent] = vi.mocked(createSlot).mock.calls[0]
    expect(stationId).toBe('st-1')
    expect(sent).toMatchObject({ startTime: '09:00', endTime: '11:00', capacity: 3 })
    expect(sent.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(await screen.findByText(/^Slot added for /)).toBeInTheDocument()
    const newDay = await screen.findByRole('region', { name: /7 Jan/ })
    expect(within(newDay).getByRole('listitem', { name: 'Slot 09:00 – 11:00' })).toBeInTheDocument()
  })

  it('generates a week of slots and reports the result', async () => {
    vi.mocked(generateSlots).mockResolvedValue({ created: 12, skipped: 3, slots: [] })
    const { events } = await openPanel()

    await events.click(screen.getByRole('button', { name: 'Generate slots' }))
    const dialog = screen.getByRole('dialog', { name: 'Generate slots' })
    await events.selectOptions(within(dialog).getByLabelText('Slot length'), '240')
    await events.click(within(dialog).getByRole('button', { name: 'Generate slots' }))

    expect(generateSlots).toHaveBeenCalledWith('st-1', expect.objectContaining({ days: 7, slotMinutes: 240, capacity: null }))
    expect(await screen.findByText('12 slots created (3 skipped because the time was already taken).')).toBeInTheDocument()
  })

  it('changes capacity and closes a slot', async () => {
    vi.mocked(updateSlot).mockResolvedValue(slot({ capacity: 2, isOpen: false }))
    const { events } = await openPanel()

    await events.click(within(row('10:00 – 12:00')).getByRole('button', { name: 'Change slot' }))
    const dialog = screen.getByRole('dialog', { name: 'Change slot' })
    const capacity = within(dialog).getByLabelText(/^Bays in this slot/)
    await events.clear(capacity)
    await events.type(capacity, '2')
    await events.click(within(dialog).getByRole('switch', { name: 'Open for booking' }))
    await events.click(within(dialog).getByRole('button', { name: 'Save slot' }))

    expect(updateSlot).toHaveBeenCalledWith('free', { capacity: 2, isOpen: false })
    expect(await screen.findByText('Slot updated.')).toBeInTheDocument()
  })

  it('offers no new slots for a station out of service', async () => {
    await openPanel(station({ status: 'Inactive' }))

    expect(screen.getByText('This station is out of service, so no new slots can be added.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add slot' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Generate slots' })).not.toBeInTheDocument()
  })
})
