/*
 * File:    BookingWizardPage.test.jsx
 * Module:  Energy Reservations - unit tests
 * Owner:   Hamnad
 * Purpose: Checks the booking wizard: the seven day choices, free slots,
 *          the energy limit of one bay, the data sent to the API, changing a
 *          booking (its own slot stays available) and the 12-hour lock.
 */
import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listProsumers } from '../../api/prosumers'
import { createReservation, getReservation, updateReservation } from '../../api/reservations'
import { listSlots } from '../../api/slots'
import { listStations } from '../../api/stations'
import { apiError, pageOf } from '../../test/apiError'
import { renderPage } from '../../test/render'
import { reservation } from '../../test/reservationSamples'
import { activeProsumer } from '../../test/samples'
import { slot, station } from '../../test/stationSamples'
import { formatDayKey, nextLocalDates } from '../../utils/format'
import BookingWizardPage from './BookingWizardPage'

vi.mock('../../api/auth', () => ({ login: vi.fn(), getCurrentUser: vi.fn(() => new Promise(() => {})), changePassword: vi.fn() }))
vi.mock('../../api/prosumers', () => ({ listProsumers: vi.fn() }))
vi.mock('../../api/reservations', () => ({
  getReservation: vi.fn(),
  createReservation: vi.fn(),
  updateReservation: vi.fn(),
}))
vi.mock('../../api/slots', () => ({ listSlots: vi.fn() }))
vi.mock('../../api/stations', () => ({ listStations: vi.fn() }))

const malabe = station({ id: 'st-1', name: 'SLIIT Malabe Campus Microgrid', bayCapacityKwh: 50, totalBatterySlots: 12, availableBatterySlots: 12 })
const fullStation = station({ id: 'st-2', name: 'Galle Fort Microgrid', availableBatterySlots: 0 })
const morning = slot({ id: 'slot-a', startTime: '2099-01-05T02:30:00Z', endTime: '2099-01-05T04:30:00Z', availableBays: 3 })
const noon = slot({ id: 'slot-b', startTime: '2099-01-05T06:30:00Z', endTime: '2099-01-05T08:30:00Z', availableBays: 1 })

// The radio group with this name.
const group = (name) => screen.getByRole('radiogroup', { name })

// Opens the wizard for a new booking.
function openNew() {
  return renderPage(<BookingWizardPage />, { path: '/reservations/new', route: '/reservations/new' })
}

// Picks Kasun, Malabe, tomorrow and the 08:00 slot.
async function chooseKasunAtMalabe(events) {
  await events.type(screen.getByLabelText('Find the prosumer'), 'Kasun')
  await events.click(await screen.findByRole('button', { name: /^Kasun Perera/ }))
  await events.click(within(group('Station')).getByRole('radio', { name: 'SLIIT Malabe Campus Microgrid' }))
  await events.click(within(group('Day')).getAllByRole('radio')[1])
  await events.click(await screen.findByRole('radio', { name: '08:00 – 10:00' }))
}

beforeEach(() => {
  vi.mocked(listStations).mockResolvedValue([malabe, fullStation])
  vi.mocked(listProsumers).mockResolvedValue(pageOf([activeProsumer]))
  vi.mocked(listSlots).mockResolvedValue([morning, noon])
})

describe('BookingWizardPage', () => {
  it('books a free slot for an active prosumer', async () => {
    vi.mocked(createReservation).mockResolvedValue(reservation({ status: 'Pending' }))
    const { events } = openNew()

    // Seven days to choose from, starting today.
    const days = within(group('Day')).getAllByRole('radio')
    expect(days).toHaveLength(7)
    expect(days[0]).toBeChecked()
    expect(screen.getByRole('radio', { name: formatDayKey(nextLocalDates(7)[6]) })).toBeInTheDocument()
    expect(await screen.findByRole('radio', { name: 'Galle Fort Microgrid' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Book this slot' })).toBeDisabled()

    await chooseKasunAtMalabe(events)
    expect(listProsumers).toHaveBeenLastCalledWith({ search: 'Kasun', status: 'Active', pageSize: 5 })
    const tomorrow = nextLocalDates(2)[1]
    expect(listSlots).toHaveBeenLastCalledWith('st-1', { from: tomorrow, to: tomorrow, onlyAvailable: true })
    expect(screen.getByRole('radio', { name: '08:00 – 10:00' })).toHaveAccessibleDescription('3 of 4 bays free')

    // One booking cannot hold more than one battery bay.
    const energy = screen.getByLabelText(/^Energy \(kWh\)/)
    expect(energy).toHaveAttribute('max', '50')
    await events.type(energy, '120')
    expect(screen.getByText('At most 50 kWh fits in one battery bay at this station.')).toBeInTheDocument()
    await events.clear(energy)
    await events.type(energy, '12.5')
    await events.click(screen.getByRole('radio', { name: 'Export' }))

    const summary = screen.getByRole('button', { name: 'Book this slot' }).closest('section')
    expect(summary).toHaveTextContent('Kasun Perera (200034501234)')
    expect(summary).toHaveTextContent('08:00 – 10:00')
    await events.click(screen.getByRole('button', { name: 'Book this slot' }))

    expect(createReservation).toHaveBeenCalledWith({ slotId: 'slot-a', energyKwh: 12.5, tradeType: 'Export', prosumerNic: '200034501234' })
    expect(await screen.findByText('Booking RSV-7KQ4M2 was made and waits for approval.')).toBeInTheDocument()
    expect(screen.getByText('Other page')).toBeInTheDocument()
  })

  it('shows why the API refused a booking and reloads the free slots', async () => {
    vi.mocked(createReservation).mockRejectedValue(apiError(409, { detail: 'This slot is fully booked. Please choose another slot.' }))
    const { events } = openNew()
    await chooseKasunAtMalabe(events)
    await events.type(screen.getByLabelText(/^Energy \(kWh\)/), '5')
    await events.click(screen.getByRole('radio', { name: 'Import' }))
    const calls = vi.mocked(listSlots).mock.calls.length

    await events.click(screen.getByRole('button', { name: 'Book this slot' }))

    expect(await screen.findByText('This slot is fully booked. Please choose another slot.')).toBeInTheDocument()
    await waitFor(() => expect(vi.mocked(listSlots).mock.calls.length).toBeGreaterThan(calls))
  })

  it("changes a booking and keeps its own slot even when that slot is full", async () => {
    vi.mocked(getReservation).mockResolvedValue(
      reservation({ slotId: 'slot-own', stationId: 'st-1', startTime: '2099-01-05T02:30:00Z', endTime: '2099-01-05T04:30:00Z' }),
    )
    vi.mocked(listSlots).mockResolvedValue([noon])
    vi.mocked(updateReservation).mockResolvedValue(reservation({ status: 'Pending' }))
    const { events } = renderPage(<BookingWizardPage />, { path: '/reservations/res-9/edit', route: '/reservations/:id/edit' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Change booking' })).toBeInTheDocument()
    expect(screen.getByText('A booking always stays with the same prosumer.')).toBeInTheDocument()
    expect(await screen.findByRole('radio', { name: 'SLIIT Malabe Campus Microgrid' })).toBeChecked()
    const own = await screen.findByRole('radio', { name: '08:00 – 10:00' })
    expect(own).toBeChecked()
    expect(own).toHaveAccessibleDescription('This booking’s slot')
    expect(screen.getByRole('radio', { name: 'Export' })).toBeChecked()
    expect(screen.getByLabelText(/^Energy \(kWh\)/)).toHaveValue(10)

    await events.click(screen.getByRole('radio', { name: '12:00 – 14:00' }))
    await events.click(screen.getByRole('radio', { name: 'Import' }))
    await events.clear(screen.getByLabelText(/^Energy \(kWh\)/))
    await events.type(screen.getByLabelText(/^Energy \(kWh\)/), '8')
    await events.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(updateReservation).toHaveBeenCalledWith('res-9', { slotId: 'slot-b', energyKwh: 8, tradeType: 'Import' })
    expect(await screen.findByText('RSV-7KQ4M2 was changed and waits for approval again.')).toBeInTheDocument()
  })

  it('does not offer changes once the 12-hour deadline has passed', async () => {
    vi.mocked(getReservation).mockResolvedValue(reservation({ canModify: false }))
    renderPage(<BookingWizardPage />, { path: '/reservations/res-9/edit', route: '/reservations/:id/edit' })

    expect(await screen.findByRole('heading', { name: 'This booking can no longer be changed' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open the booking' })).toHaveAttribute('href', '/reservations/res-9')
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
  })

  it('reports a booking that does not exist', async () => {
    vi.mocked(getReservation).mockRejectedValue(apiError(404, { detail: 'Reservation not found.' }))
    renderPage(<BookingWizardPage />, { path: '/reservations/nope/edit', route: '/reservations/:id/edit' })

    expect(await screen.findByText('Booking not found')).toBeInTheDocument()
    expect(screen.getByText('Reservation not found.')).toBeInTheDocument()
  })
})
