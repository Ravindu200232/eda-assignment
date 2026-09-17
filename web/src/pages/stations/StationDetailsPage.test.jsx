/*
 * File:    StationDetailsPage.test.jsx
 * Module:  Microgrid Stations - unit tests
 * Owner:   Nimthara
 * Purpose: Checks the station page: figures, battery bays, the Backoffice
 *          actions (with the API's refusal message) and editing the hours.
 */
import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listSlots } from '../../api/slots'
import { deactivateStation, getStation, setBatterySlots, updateSchedule } from '../../api/stations'
import { apiError } from '../../test/apiError'
import { adminUser, operatorUser, renderPage } from '../../test/render'
import { station } from '../../test/stationSamples'
import StationDetailsPage from './StationDetailsPage'

vi.mock('../../api/auth', () => ({ login: vi.fn(), getCurrentUser: vi.fn(() => new Promise(() => {})), changePassword: vi.fn() }))
vi.mock('../../api/stations', () => ({
  getStation: vi.fn(),
  setBatterySlots: vi.fn(),
  updateSchedule: vi.fn(),
  deactivateStation: vi.fn(),
  activateStation: vi.fn(),
  deleteStation: vi.fn(),
}))
vi.mock('../../api/slots', () => ({
  listSlots: vi.fn(),
  createSlot: vi.fn(),
  generateSlots: vi.fn(),
  updateSlot: vi.fn(),
  deleteSlot: vi.fn(),
}))
vi.mock('../../components/maps/StationMap', () => ({ default: ({ label }) => <div role="region" aria-label={label} /> }))

// Opens the page for the sample station.
async function openStation(user) {
  const view = renderPage(<StationDetailsPage />, { path: '/stations/st-1', route: '/stations/:id', user })
  await screen.findByRole('heading', { level: 1, name: 'Kandy Lakeside Energy Node' })
  return view
}

beforeEach(() => {
  vi.mocked(getStation).mockResolvedValue(station())
  vi.mocked(listSlots).mockResolvedValue([])
})

describe('StationDetailsPage', () => {
  it('shows the station figures, map and hours', async () => {
    await openStation(operatorUser)

    expect(screen.getByText('SSG-KAN-01')).toBeInTheDocument()
    expect(screen.getByText('up to 60 kWh')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Map showing Kandy Lakeside Energy Node' })).toBeInTheDocument()
    const hours = screen.getByRole('list', { name: 'Weekly opening hours' })
    expect(within(hours).getAllByText('06:00 – 18:00')).toHaveLength(7)
    expect(await screen.findByRole('heading', { name: 'No slots in the next 7 days' })).toBeInTheDocument()
  })

  it('lets any staff member save the battery bays', async () => {
    vi.mocked(setBatterySlots).mockResolvedValue(station({ availableBatterySlots: 4 }))
    const { events } = await openStation(operatorUser)

    const save = screen.getByRole('button', { name: 'Save bays' })
    expect(save).toBeDisabled()
    await events.click(screen.getByRole('button', { name: 'One bay less' }))
    await events.click(screen.getByRole('button', { name: 'One bay less' }))
    expect(screen.getByRole('status', { name: 'Bays available' })).toHaveTextContent('4')
    await events.click(save)

    expect(setBatterySlots).toHaveBeenCalledWith('st-1', 4)
    expect(await screen.findByText('Kandy Lakeside Energy Node: 4 of 8 bays available.')).toBeInTheDocument()
  })

  it('hides the Backoffice actions from Grid Operators', async () => {
    await openStation(operatorUser)

    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit hours' })).not.toBeInTheDocument()
  })

  it('shows why a station cannot be deactivated', async () => {
    vi.mocked(deactivateStation).mockRejectedValue(
      apiError(400, { detail: 'This station has active reservations. Cancel or complete them before deactivating the station.' }),
    )
    const { events } = await openStation(adminUser)

    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/stations/st-1/edit')
    await events.click(screen.getByRole('button', { name: 'Deactivate' }))
    const dialog = screen.getByRole('dialog', { name: 'Take this station out of service?' })
    await events.click(within(dialog).getByRole('button', { name: 'Deactivate' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('This station has active reservations.')
  })

  it('saves new opening hours', async () => {
    vi.mocked(updateSchedule).mockImplementation(async (id, schedule) => station({ schedule }))
    const { events } = await openStation(adminUser)

    await events.click(screen.getByRole('button', { name: 'Edit hours' }))
    const dialog = screen.getByRole('dialog', { name: 'Opening hours' })
    await events.click(within(dialog).getByRole('button', { name: 'Open 24 hours' }))
    await events.click(within(dialog).getByRole('switch', { name: 'Open on Sunday' }))
    await events.click(within(dialog).getByRole('button', { name: 'Save hours' }))

    const [, schedule] = vi.mocked(updateSchedule).mock.calls[0]
    expect(schedule).toHaveLength(6)
    expect(schedule[0]).toEqual({ day: 'Monday', openTime: '00:00', closeTime: '24:00' })
    const hours = await screen.findByRole('list', { name: 'Weekly opening hours' })
    expect(within(hours).getAllByText('Open 24 hours')).toHaveLength(6)
    expect(within(hours).getByText('Closed')).toBeInTheDocument()
  })
})
