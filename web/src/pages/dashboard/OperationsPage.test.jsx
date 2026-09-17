/*
 * File:    OperationsPage.test.jsx
 * Module:  Dashboards - unit tests
 * Owner:   Malith
 * Purpose: Checks the Grid Operator page: today's bookings in time order,
 *          hidden cancelled bookings and the check-in shortcut.
 */
import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getBookingsForDay, getStaffSummary } from '../../api/dashboard'
import { pageOf } from '../../test/apiError'
import { operatorUser, renderPage } from '../../test/render'
import { booking, staffSummary } from '../../test/samples'
import { localDateKey } from '../../utils/format'
import OperationsPage from './OperationsPage'

vi.mock('../../api/auth', () => ({ login: vi.fn(), getCurrentUser: vi.fn(() => new Promise(() => {})), changePassword: vi.fn() }))
vi.mock('../../api/dashboard', () => ({ getPublicSummary: vi.fn(), getStaffSummary: vi.fn(), getBookingsForDay: vi.fn() }))
vi.mock('../../api/stations', () => ({ listStations: vi.fn(async () => []), setBatterySlots: vi.fn() }))

const todays = [
  booking({ id: 'late', referenceNo: 'RSV-LATE', prosumerName: 'Late Booking', startTime: '2026-09-17T10:30:00Z', status: 'Pending' }),
  booking({ id: 'gone', referenceNo: 'RSV-GONE', prosumerName: 'Cancelled Booking', status: 'Cancelled' }),
  booking({ id: 'early', referenceNo: 'RSV-EARLY', prosumerName: 'Early Booking', startTime: '2026-09-17T02:30:00Z', status: 'Approved' }),
]

describe('OperationsPage', () => {
  it("lists today's bookings earliest first without cancelled ones", async () => {
    vi.mocked(getStaffSummary).mockResolvedValue(staffSummary())
    vi.mocked(getBookingsForDay).mockResolvedValue(pageOf(todays))
    renderPage(<OperationsPage />, { path: '/operations', user: operatorUser })

    const list = await screen.findByRole('list', { name: "Today's bookings" })
    const names = within(list)
      .getAllByRole('listitem')
      .map((item) => within(item).getByText(/Booking$/).textContent)
    expect(names).toEqual(['Early Booking', 'Late Booking'])
    expect(getBookingsForDay).toHaveBeenCalledWith(localDateKey())
  })

  it('offers check-in only for approved bookings', async () => {
    vi.mocked(getStaffSummary).mockResolvedValue(staffSummary())
    vi.mocked(getBookingsForDay).mockResolvedValue(pageOf(todays))
    renderPage(<OperationsPage />, { path: '/operations', user: operatorUser })

    const list = await screen.findByRole('list', { name: "Today's bookings" })
    const [early, late] = within(list).getAllByRole('listitem')
    expect(within(early).getByRole('link', { name: 'Check in' })).toHaveAttribute('href', '/check-in')
    expect(within(late).queryByRole('link', { name: 'Check in' })).not.toBeInTheDocument()
  })

  it('shows the live numbers for the operator', async () => {
    vi.mocked(getStaffSummary).mockResolvedValue(staffSummary())
    vi.mocked(getBookingsForDay).mockResolvedValue(pageOf([]))
    renderPage(<OperationsPage />, { path: '/operations', user: operatorUser })

    const numbers = await screen.findByRole('region', { name: 'Live numbers' })
    expect(await within(numbers).findByText('3')).toBeInTheDocument()
    expect(within(numbers).getByText('7')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No bookings today' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open QR check-in' })).toHaveAttribute('href', '/check-in')
  })
})
