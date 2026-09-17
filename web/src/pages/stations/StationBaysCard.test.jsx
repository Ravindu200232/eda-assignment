/*
 * File:    StationBaysCard.test.jsx
 * Module:  Microgrid Stations - unit tests
 * Owner:   Nimthara
 * Purpose: Checks the Operations page shortcut that changes battery bays in one click.
 */
import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { listStations, setBatterySlots } from '../../api/stations'
import { apiError } from '../../test/apiError'
import { operatorUser, renderPage } from '../../test/render'
import { station } from '../../test/stationSamples'
import StationBaysCard from './StationBaysCard'

vi.mock('../../api/auth', () => ({ login: vi.fn(), getCurrentUser: vi.fn(() => new Promise(() => {})), changePassword: vi.fn() }))
vi.mock('../../api/stations', () => ({ listStations: vi.fn(), setBatterySlots: vi.fn() }))

describe('StationBaysCard', () => {
  it('lists stations in service and saves a change at once', async () => {
    vi.mocked(listStations).mockResolvedValue([station({ availableBatterySlots: 8 })])
    vi.mocked(setBatterySlots).mockResolvedValue(station({ availableBatterySlots: 7 }))
    const { events } = renderPage(<StationBaysCard />, { user: operatorUser })

    const list = await screen.findByRole('list', { name: 'Battery bays per station' })
    expect(listStations).toHaveBeenCalledWith({ status: 'Active' })
    expect(within(list).getByRole('button', { name: 'One bay more at Kandy Lakeside Energy Node' })).toBeDisabled()

    await events.click(within(list).getByRole('button', { name: 'One bay less at Kandy Lakeside Energy Node' }))

    expect(setBatterySlots).toHaveBeenCalledWith('st-1', 7)
    expect(await within(list).findByText('7 of 8 bays')).toBeInTheDocument()
  })

  it('shows the API message when a change fails', async () => {
    vi.mocked(listStations).mockResolvedValue([station()])
    vi.mocked(setBatterySlots).mockRejectedValue(apiError(400, { detail: 'Available battery slots must be between 0 and 8.' }))
    const { events } = renderPage(<StationBaysCard />, { user: operatorUser })

    await events.click(await screen.findByRole('button', { name: 'One bay more at Kandy Lakeside Energy Node' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Available battery slots must be between 0 and 8.')
    expect(screen.getByText('6 of 8 bays')).toBeInTheDocument()
  })
})
