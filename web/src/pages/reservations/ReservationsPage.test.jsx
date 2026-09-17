/*
 * File:    ReservationsPage.test.jsx
 * Module:  Energy Reservations - unit tests
 * Owner:   Hamnad
 * Purpose: Checks the booking list: tabs from the address, the filters sent
 *          to the API, the "Missed" label and approving or rejecting from
 *          the list.
 */
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { approveReservation, listReservations, rejectReservation } from '../../api/reservations'
import { listStations } from '../../api/stations'
import { pageOf } from '../../test/apiError'
import { operatorUser, renderPage } from '../../test/render'
import { pendingReservation, reservation } from '../../test/reservationSamples'
import { station } from '../../test/stationSamples'
import ReservationsPage from './ReservationsPage'

vi.mock('../../api/auth', () => ({ login: vi.fn(), getCurrentUser: vi.fn(() => new Promise(() => {})), changePassword: vi.fn() }))
vi.mock('../../api/reservations', () => ({
  listReservations: vi.fn(),
  getReservation: vi.fn(),
  createReservation: vi.fn(),
  updateReservation: vi.fn(),
  cancelReservation: vi.fn(),
  approveReservation: vi.fn(),
  rejectReservation: vi.fn(),
  getReservationQr: vi.fn(),
}))
vi.mock('../../api/stations', () => ({ listStations: vi.fn() }))

// Opens the list at an address such as /reservations?tab=history.
function openList(path = '/reservations') {
  return renderPage(<ReservationsPage />, { path, route: '/reservations', user: operatorUser })
}

beforeEach(() => {
  vi.mocked(listStations).mockResolvedValue([station(), station({ id: 'st-2', name: 'Galle Fort Microgrid' })])
  vi.mocked(listReservations).mockResolvedValue(pageOf([reservation()]))
})

describe('ReservationsPage', () => {
  it('opens the tab named in the address', async () => {
    openList('/reservations?tab=current')

    expect(await screen.findByRole('link', { name: 'RSV-7KQ4M2' })).toHaveAttribute('href', '/reservations/res-9')
    expect(screen.getByRole('tab', { name: 'Current' })).toHaveAttribute('aria-selected', 'true')
    expect(listReservations).toHaveBeenCalledWith(expect.objectContaining({ scope: 'Current', page: 1, pageSize: 10 }))
    // The status filter only makes sense for the History and All lists.
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument()
  })

  it('starts on pending bookings, shows missed ones and keeps the tab in the address', async () => {
    vi.mocked(listReservations).mockResolvedValue(pageOf([pendingReservation({ isPast: true })]))
    const { events, router } = openList()

    const row = (await screen.findByRole('link', { name: 'RSV-7KQ4M2' })).closest('tr')
    expect(within(row).getByText('Missed')).toBeInTheDocument()
    expect(within(row).getByText('Kasun Perera')).toBeInTheDocument()
    // A booking that has ended can no longer be approved.
    expect(within(row).queryByRole('button', { name: 'Approve RSV-7KQ4M2' })).not.toBeInTheDocument()
    expect(listReservations).toHaveBeenLastCalledWith(expect.objectContaining({ scope: 'Pending' }))

    await events.click(screen.getByRole('tab', { name: 'History' }))

    await waitFor(() => expect(listReservations).toHaveBeenLastCalledWith(expect.objectContaining({ scope: 'History' })))
    expect(router.state.location.search).toBe('?tab=history')
  })

  it('sends the search and filters, and clears them again', async () => {
    const { events } = openList('/reservations?tab=all')
    await screen.findByRole('link', { name: 'RSV-7KQ4M2' })
    await screen.findByRole('option', { name: 'Galle Fort Microgrid' })

    await events.selectOptions(screen.getByLabelText('Station'), 'Galle Fort Microgrid')
    await events.selectOptions(screen.getByLabelText('Status'), 'Rejected')
    await events.type(screen.getByLabelText('Prosumer NIC'), '995671234V')
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2099-01-01' } })
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2099-01-07' } })
    await events.type(screen.getByLabelText('Search bookings'), 'RSV-DEMO')

    await waitFor(() =>
      expect(listReservations).toHaveBeenLastCalledWith({
        scope: undefined,
        status: 'Rejected',
        stationId: 'st-2',
        nic: '995671234V',
        from: '2099-01-01',
        to: '2099-01-07',
        search: 'RSV-DEMO',
        page: 1,
        pageSize: 10,
      }),
    )

    await events.click(screen.getByRole('button', { name: 'Clear filters' }))

    await waitFor(() =>
      expect(listReservations).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: undefined, stationId: undefined, nic: undefined, from: undefined, search: undefined }),
      ),
    )
    expect(screen.getByLabelText('Search bookings')).toHaveValue('')
  })

  it('approves a pending booking from the list', async () => {
    vi.mocked(listReservations).mockResolvedValue(pageOf([pendingReservation()]))
    vi.mocked(approveReservation).mockResolvedValue(reservation())
    const { events } = openList()

    await events.click(await screen.findByRole('button', { name: 'Approve RSV-7KQ4M2' }))
    const dialog = screen.getByRole('dialog', { name: 'Approve this booking?' })
    expect(dialog).toHaveTextContent('Kasun Perera at SLIIT Malabe Campus Microgrid')
    await events.click(within(dialog).getByRole('button', { name: 'Approve' }))

    expect(approveReservation).toHaveBeenCalledWith('res-9')
    expect(await screen.findByText('RSV-7KQ4M2 is approved. The QR code is ready.')).toBeInTheDocument()
    expect(listReservations).toHaveBeenCalledTimes(2)
  })

  it('needs a reason to reject a booking', async () => {
    vi.mocked(listReservations).mockResolvedValue(pageOf([pendingReservation()]))
    vi.mocked(rejectReservation).mockResolvedValue(pendingReservation({ status: 'Rejected' }))
    const { events } = openList()

    await events.click(await screen.findByRole('button', { name: 'Reject RSV-7KQ4M2' }))
    const dialog = screen.getByRole('dialog', { name: 'Reject this booking?' })
    const confirm = within(dialog).getByRole('button', { name: 'Reject booking' })
    expect(confirm).toBeDisabled()

    await events.type(within(dialog).getByLabelText(/^Reason for the prosumer/), '  Battery maintenance ')
    await events.click(confirm)

    expect(rejectReservation).toHaveBeenCalledWith('res-9', 'Battery maintenance')
    expect(await screen.findByText('RSV-7KQ4M2 was rejected.')).toBeInTheDocument()
  })

  it('explains an empty list', async () => {
    vi.mocked(listReservations).mockResolvedValue(pageOf([]))
    openList()

    expect(await screen.findByText('Nothing is waiting for approval')).toBeInTheDocument()
  })
})
