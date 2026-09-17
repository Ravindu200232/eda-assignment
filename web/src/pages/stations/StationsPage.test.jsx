/*
 * File:    StationsPage.test.jsx
 * Module:  Microgrid Stations - unit tests
 * Owner:   Nimthara
 * Purpose: Checks the station list, the filters sent to the API, the map
 *          view selection and the Backoffice-only "New station" button.
 */
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { listStations } from '../../api/stations'
import { adminUser, operatorUser, renderPage } from '../../test/render'
import { station } from '../../test/stationSamples'
import StationsPage from './StationsPage'

vi.mock('../../api/auth', () => ({ login: vi.fn(), getCurrentUser: vi.fn(() => new Promise(() => {})), changePassword: vi.fn() }))
vi.mock('../../api/stations', () => ({ listStations: vi.fn() }))
vi.mock('../../components/maps/StationMap', () => ({
  default: ({ stations, onSelect }) => (
    <div role="region" aria-label="Map of stations">
      {stations.map((item) => (
        <button key={item.id} type="button" onClick={() => onSelect(item)}>
          Pin {item.name}
        </button>
      ))}
    </div>
  ),
}))

const malabe = station({
  id: 'st-2',
  code: 'SSG-MAL-01',
  name: 'SLIIT Malabe Campus Microgrid',
  address: 'New Kandy Road, Malabe',
  availableBatterySlots: 0,
  totalBatterySlots: 12,
  schedule: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => ({ day, openTime: '00:00', closeTime: '24:00' })),
})
const negombo = station({ id: 'st-3', code: 'SSG-NEG-01', name: 'Negombo Beach Solar Station', status: 'Inactive', schedule: [] })

describe('StationsPage', () => {
  it('lists stations with bays, hours and status', async () => {
    vi.mocked(listStations).mockResolvedValue([station(), malabe, negombo])
    renderPage(<StationsPage />, { path: '/stations', user: operatorUser })

    const kandy = (await screen.findByRole('link', { name: 'Kandy Lakeside Energy Node' })).closest('tr')
    expect(within(kandy).getByText('6 of 8 bays')).toBeInTheDocument()
    expect(within(kandy).getByText('06:00 – 18:00')).toBeInTheDocument()
    expect(within(kandy).getByText('In service')).toBeInTheDocument()

    const malabeRow = screen.getByRole('link', { name: 'SLIIT Malabe Campus Microgrid' }).closest('tr')
    expect(within(malabeRow).getByText('Open 24 hours')).toBeInTheDocument()
    expect(within(malabeRow).getByRole('meter')).toHaveAttribute('aria-valuetext', '0 of 12 bays available')

    const negomboRow = screen.getByRole('link', { name: 'Negombo Beach Solar Station' }).closest('tr')
    expect(within(negomboRow).getByText('Closed')).toBeInTheDocument()
    expect(within(negomboRow).getByText('Out of service')).toBeInTheDocument()
    expect(screen.getByText(/2 of 3 shown stations are in service/)).toBeInTheDocument()
  })

  it('sends the status filter to the API', async () => {
    vi.mocked(listStations).mockResolvedValue([station()])
    const { events } = renderPage(<StationsPage />, { path: '/stations', user: operatorUser })
    await screen.findByRole('link', { name: 'Kandy Lakeside Energy Node' })

    await events.click(screen.getByRole('tab', { name: 'Out of service' }))

    await waitFor(() => expect(listStations).toHaveBeenLastCalledWith({ status: 'Inactive', search: undefined }))
  })

  it('shows the station picked on the map', async () => {
    vi.mocked(listStations).mockResolvedValue([station(), malabe])
    const { events } = renderPage(<StationsPage />, { path: '/stations', user: operatorUser })
    await screen.findByRole('link', { name: 'Kandy Lakeside Energy Node' })

    await events.click(screen.getByRole('tab', { name: 'Map' }))
    expect(screen.getByRole('heading', { name: 'Pick a station' })).toBeInTheDocument()
    await events.click(screen.getByRole('button', { name: 'Pin SLIIT Malabe Campus Microgrid' }))

    expect(screen.getByRole('heading', { name: 'SLIIT Malabe Campus Microgrid' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open station' })).toHaveAttribute('href', '/stations/st-2')
  })

  it('offers "New station" to Backoffice users only', async () => {
    vi.mocked(listStations).mockResolvedValue([])
    const { unmount } = renderPage(<StationsPage />, { path: '/stations', user: operatorUser })
    expect(await screen.findByRole('heading', { name: 'No stations yet' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'New station' })).not.toBeInTheDocument()
    unmount()

    renderPage(<StationsPage />, { path: '/stations', user: adminUser })
    expect(await screen.findByRole('link', { name: 'New station' })).toHaveAttribute('href', '/stations/new')
  })
})
