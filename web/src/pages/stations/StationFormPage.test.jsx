/*
 * File:    StationFormPage.test.jsx
 * Module:  Microgrid Stations - unit tests
 * Owner:   Nimthara
 * Purpose: Checks the station form: the create payload with schedule, the
 *          edit payload, API field errors and the "no open day" guard.
 */
import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createStation, getStation, updateStation } from '../../api/stations'
import { apiError } from '../../test/apiError'
import { renderRoutes } from '../../test/render'
import { station } from '../../test/stationSamples'
import StationFormPage from './StationFormPage'

vi.mock('../../api/auth', () => ({ login: vi.fn(), getCurrentUser: vi.fn(() => new Promise(() => {})), changePassword: vi.fn() }))
vi.mock('../../api/stations', () => ({ getStation: vi.fn(), createStation: vi.fn(), updateStation: vi.fn() }))
vi.mock('../../components/maps/PickerMap', () => ({
  default: ({ onPick }) => (
    <button type="button" onClick={() => onPick({ lat: 6.9, lng: 79.95 })}>
      Pretend map click
    </button>
  ),
}))

const routes = [
  { path: '/stations/new', element: <StationFormPage /> },
  { path: '/stations/:id/edit', element: <StationFormPage /> },
  { path: '/stations/:id', element: <p>Station page</p> },
]

// Fills the required details of a new station.
async function fillDetails(events) {
  await events.type(screen.getByLabelText(/^Station code/), 'SSG-TST-01')
  await events.type(screen.getByLabelText(/^Station name/), 'Test Bay Station')
  await events.type(screen.getByLabelText(/^Address/), 'No. 1, Test Road, Colombo')
  await events.type(screen.getByLabelText(/^Solar capacity/), '90')
  await events.type(screen.getByLabelText(/^Storage/), '360')
  await events.type(screen.getByLabelText(/^Battery bays/), '6')
  await events.click(screen.getByRole('button', { name: 'Pretend map click' }))
}

describe('StationFormPage', () => {
  it('creates a station with its opening hours', async () => {
    vi.mocked(createStation).mockResolvedValue(station({ id: 'new-1', name: 'Test Bay Station' }))
    const { events, router } = renderRoutes(routes, { path: '/stations/new' })

    await fillDetails(events)
    expect(screen.getByText('Each booking can use up to about 60 kWh (storage divided by bays).')).toBeInTheDocument()
    await events.click(screen.getByRole('switch', { name: 'Open on Sunday' }))
    await events.click(screen.getByRole('button', { name: 'Create station' }))

    const sent = vi.mocked(createStation).mock.calls[0][0]
    expect(sent).toMatchObject({
      code: 'SSG-TST-01',
      name: 'Test Bay Station',
      address: 'No. 1, Test Road, Colombo',
      latitude: 6.9,
      longitude: 79.95,
      solarCapacityKw: 90,
      storageCapacityKwh: 360,
      totalBatterySlots: 6,
    })
    expect(sent.schedule).toHaveLength(6)
    expect(sent.schedule[0]).toEqual({ day: 'Monday', openTime: '06:00', closeTime: '18:00' })
    expect(await screen.findByText('Station page')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/stations/new-1')
  })

  it('shows the API messages under the fields', async () => {
    vi.mocked(createStation).mockRejectedValue(
      apiError(400, { detail: 'Station code must be 3 to 20 letters.', errors: { Code: ['Station code must be 3 to 20 letters.'] } }),
    )
    const { events } = renderRoutes(routes, { path: '/stations/new' })

    await events.click(screen.getByRole('button', { name: 'Create station' }))

    expect(await screen.findByText('Station code must be 3 to 20 letters.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Please check the highlighted fields.')
  })

  it('needs at least one open day', async () => {
    const { events } = renderRoutes(routes, { path: '/stations/new' })

    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) {
      await events.click(screen.getByRole('switch', { name: `Open on ${day}` }))
    }
    await events.click(screen.getByRole('button', { name: 'Create station' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Open the station on at least one day.')
    expect(createStation).not.toHaveBeenCalled()
  })

  it('edits the details without the schedule', async () => {
    vi.mocked(getStation).mockResolvedValue(station())
    vi.mocked(updateStation).mockResolvedValue(station({ name: 'Kandy Lake Node' }))
    const { events } = renderRoutes(routes, { path: '/stations/st-1/edit' })

    const name = await screen.findByLabelText(/^Station name/)
    expect(screen.queryByRole('list', { name: 'Opening hours' })).not.toBeInTheDocument()
    expect(screen.getByLabelText(/^Latitude/)).toHaveValue('7.2926')
    await events.clear(name)
    await events.type(name, 'Kandy Lake Node')
    await events.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(updateStation).toHaveBeenCalledWith('st-1', {
      code: 'SSG-KAN-01',
      name: 'Kandy Lake Node',
      address: 'Lake Road, Kandy',
      latitude: 7.2926,
      longitude: 80.6413,
      solarCapacityKw: 120,
      storageCapacityKwh: 480,
      totalBatterySlots: 8,
    })
    expect(await screen.findByText('Station page')).toBeInTheDocument()
  })

  it('explains when the station to edit does not exist', async () => {
    vi.mocked(getStation).mockRejectedValue(apiError(404, { detail: 'Station not found.' }))
    renderRoutes(routes, { path: '/stations/missing/edit' })

    const card = await screen.findByRole('heading', { name: 'Station not found' })
    expect(within(card.closest('section')).getByText('Station not found.')).toBeInTheDocument()
  })
})
