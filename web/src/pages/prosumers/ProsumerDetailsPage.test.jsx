/*
 * File:    ProsumerDetailsPage.test.jsx
 * Module:  Prosumer Accounts - unit tests
 * Owner:   Malith
 * Purpose: Checks the profile, the booking list (with missed bookings) and
 *          editing from the details page.
 */
import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getProsumer, listProsumerBookings, updateProsumer } from '../../api/prosumers'
import { apiError, pageOf } from '../../test/apiError'
import { renderPage } from '../../test/render'
import { activeProsumer, booking } from '../../test/samples'
import ProsumerDetailsPage from './ProsumerDetailsPage'

vi.mock('../../api/auth', () => ({ login: vi.fn(), getCurrentUser: vi.fn(() => new Promise(() => {})), changePassword: vi.fn() }))
vi.mock('../../api/prosumers', () => ({
  listProsumers: vi.fn(),
  listPendingActivations: vi.fn(),
  getProsumer: vi.fn(),
  createProsumer: vi.fn(),
  updateProsumer: vi.fn(),
  deactivateProsumer: vi.fn(),
  activateProsumer: vi.fn(),
  listProsumerBookings: vi.fn(),
}))

// Opens the details page for Kasun.
function openKasun() {
  return renderPage(<ProsumerDetailsPage />, { path: '/prosumers/200034501234', route: '/prosumers/:nic' })
}

describe('ProsumerDetailsPage', () => {
  it('shows the profile and the bookings', async () => {
    vi.mocked(getProsumer).mockResolvedValue(activeProsumer)
    vi.mocked(listProsumerBookings).mockResolvedValue(
      pageOf([
        booking({ id: 'a', referenceNo: 'RSV-A', status: 'Approved', isPast: true }),
        booking({ id: 'b', referenceNo: 'RSV-B', status: 'Completed', isPast: true, deliveredKwh: 9.5 }),
      ]),
    )
    openKasun()

    expect(await screen.findByRole('heading', { level: 1, name: 'Kasun Perera' })).toBeInTheDocument()
    expect(screen.getByText('No. 12, Temple Road, Malabe')).toBeInTheDocument()
    expect(screen.getByText('5.5 kW')).toBeInTheDocument()
    expect(getProsumer).toHaveBeenCalledWith('200034501234')

    // The bookings are loaded after the profile is on screen, so wait for the table first.
    const table = await screen.findByRole('table', { name: 'Prosumer bookings' })
    expect(listProsumerBookings).toHaveBeenCalledWith('200034501234', { page: 1, pageSize: 8 })
    const missed = within(table).getByRole('link', { name: 'RSV-A' }).closest('tr')
    expect(within(missed).getByText('Missed')).toBeInTheDocument()
    const done = within(table).getByRole('link', { name: 'RSV-B' }).closest('tr')
    expect(within(done).getByText('9.5 kWh')).toBeInTheDocument()
  })

  it('saves edited details and shows them', async () => {
    vi.mocked(getProsumer).mockResolvedValue(activeProsumer)
    vi.mocked(listProsumerBookings).mockResolvedValue(pageOf([]))
    vi.mocked(updateProsumer).mockResolvedValue({ ...activeProsumer, phone: '0719998877' })
    const { events } = openKasun()
    await screen.findByRole('heading', { level: 1, name: 'Kasun Perera' })

    await events.click(screen.getByRole('button', { name: 'Edit details' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit prosumer' })
    expect(within(dialog).getByLabelText(/^NIC/)).toHaveAttribute('readonly')
    expect(within(dialog).queryByLabelText(/^Password/)).not.toBeInTheDocument()
    await events.clear(within(dialog).getByLabelText(/^Phone/))
    await events.type(within(dialog).getByLabelText(/^Phone/), '0719998877')
    await events.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(updateProsumer).toHaveBeenCalledWith('200034501234', {
      fullName: 'Kasun Perera',
      email: 'kasun@example.com',
      phone: '0719998877',
      address: 'No. 12, Temple Road, Malabe',
      meterNumber: 'CEB-MLB-10021',
      solarCapacityKw: 5.5,
    })
    expect(await screen.findByText('0719998877')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No bookings yet' })).toBeInTheDocument()
  })

  it('explains when the prosumer does not exist', async () => {
    vi.mocked(getProsumer).mockRejectedValue(apiError(404, { detail: 'Prosumer not found.' }))
    openKasun()

    expect(await screen.findByRole('heading', { name: 'Prosumer not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to prosumers' })).toHaveAttribute('href', '/prosumers')
  })
})
