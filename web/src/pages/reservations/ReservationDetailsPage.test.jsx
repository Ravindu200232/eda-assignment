/*
 * File:    ReservationDetailsPage.test.jsx
 * Module:  Energy Reservations - unit tests
 * Owner:   Hamnad
 * Purpose: Checks the booking page: buttons follow the status and the
 *          12-hour rule, the QR code only for approved bookings (print and
 *          copy), cancelling with a reason, approving and missed bookings.
 */
import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { approveReservation, cancelReservation, getReservation, getReservationQr } from '../../api/reservations'
import { apiError } from '../../test/apiError'
import { renderPage } from '../../test/render'
import { pendingReservation, reservation } from '../../test/reservationSamples'
import ReservationDetailsPage from './ReservationDetailsPage'

vi.mock('../../api/auth', () => ({ login: vi.fn(), getCurrentUser: vi.fn(() => new Promise(() => {})), changePassword: vi.fn() }))
vi.mock('../../api/reservations', () => ({
  getReservation: vi.fn(),
  cancelReservation: vi.fn(),
  approveReservation: vi.fn(),
  rejectReservation: vi.fn(),
  getReservationQr: vi.fn(),
}))

const qrAnswer = {
  reservationId: 'res-9',
  referenceNo: 'RSV-7KQ4M2',
  stationName: 'SLIIT Malabe Campus Microgrid',
  startTime: '2099-01-05T04:30:00Z',
  endTime: '2099-01-05T06:30:00Z',
  payload: 'SSG1.cmVzLTk.c2lnbmF0dXJl',
}

// Opens the page of booking res-9.
function openBooking() {
  return renderPage(<ReservationDetailsPage />, { path: '/reservations/res-9', route: '/reservations/:id' })
}

beforeEach(() => {
  vi.mocked(getReservationQr).mockResolvedValue(qrAnswer)
})

describe('ReservationDetailsPage', () => {
  it('shows an approved booking with its QR code, deadline and timeline', async () => {
    vi.mocked(getReservation).mockResolvedValue(reservation())
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
    const { events } = openBooking()

    expect(await screen.findByRole('heading', { level: 1, name: 'RSV-7KQ4M2' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kasun Perera' })).toHaveAttribute('href', '/prosumers/200034501234')
    expect(screen.getByText(/can be changed or cancelled until/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Change' })).toHaveAttribute('href', '/reservations/res-9/edit')
    expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()

    const timeline = within(screen.getByRole('list', { name: 'Booking timeline' })).getAllByRole('listitem')
    expect(timeline.map((item) => item.querySelector('p').textContent)).toEqual([
      'Booked',
      'Approved',
      'Changes closeUpcoming',
      'Energy transfer startsUpcoming',
    ])

    expect(await screen.findByRole('img', { name: 'QR code for RSV-7KQ4M2' })).toBeInTheDocument()
    await events.click(screen.getByRole('button', { name: 'Print slip' }))
    expect(printSpy).toHaveBeenCalled()
    await events.click(screen.getByRole('button', { name: 'Copy code text' }))
    expect(await navigator.clipboard.readText()).toBe('SSG1.cmVzLTk.c2lnbmF0dXJl')
    expect(await screen.findByText('QR code text copied. It can be pasted on the check-in page.')).toBeInTheDocument()
  })

  it('cancels a booking with a reason', async () => {
    vi.mocked(getReservation).mockResolvedValue(reservation())
    vi.mocked(cancelReservation).mockResolvedValue(
      reservation({
        status: 'Cancelled',
        canModify: false,
        hasQrCode: false,
        cancelledAt: '2026-09-10T02:00:00Z',
        cancelledBy: '199023456789',
        reason: 'Prosumer is travelling',
      }),
    )
    const { events } = openBooking()

    await events.click(await screen.findByRole('button', { name: 'Cancel booking' }))
    const dialog = screen.getByRole('dialog', { name: 'Cancel this booking?' })
    await events.type(within(dialog).getByLabelText('Reason (optional)'), 'Prosumer is travelling')
    await events.click(within(dialog).getByRole('button', { name: 'Cancel booking' }))

    expect(cancelReservation).toHaveBeenCalledWith('res-9', 'Prosumer is travelling')
    expect(await screen.findByText('RSV-7KQ4M2 was cancelled.')).toBeInTheDocument()
    expect(screen.getAllByText('Cancelled').length).toBeGreaterThan(0)
    expect(screen.getByText('Reason:')).toBeInTheDocument()
    expect(screen.getByText('This booking is finished, so it can no longer be changed or cancelled.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Change' })).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'QR code for RSV-7KQ4M2' })).not.toBeInTheDocument()
  })

  it('approves a pending booking and then shows its QR code', async () => {
    vi.mocked(getReservation).mockResolvedValue(pendingReservation())
    vi.mocked(approveReservation).mockResolvedValue(reservation())
    const { events } = openBooking()

    expect(await screen.findByText('The QR code is created when the booking is approved.')).toBeInTheDocument()
    expect(getReservationQr).not.toHaveBeenCalled()

    await events.click(screen.getByRole('button', { name: 'Approve' }))
    await events.click(within(screen.getByRole('dialog', { name: 'Approve this booking?' })).getByRole('button', { name: 'Approve' }))

    expect(approveReservation).toHaveBeenCalledWith('res-9')
    expect(await screen.findByRole('img', { name: 'QR code for RSV-7KQ4M2' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
  })

  it('locks changes in the last 12 hours', async () => {
    vi.mocked(getReservation).mockResolvedValue(reservation({ canModify: false }))
    openBooking()

    expect(await screen.findByText(/^Changes closed at /)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Change' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument()
  })

  it('marks a booking that ended without check-in as missed', async () => {
    vi.mocked(getReservation).mockResolvedValue(pendingReservation({ isPast: true, canModify: false }))
    openBooking()

    expect(await screen.findByText('Missed booking')).toBeInTheDocument()
    expect(screen.getAllByText('Missed').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    expect(screen.queryByText('The QR code is created when the booking is approved.')).not.toBeInTheDocument()
  })

  it('offers a retry when the QR code cannot be loaded', async () => {
    vi.mocked(getReservation).mockResolvedValue(reservation())
    vi.mocked(getReservationQr).mockRejectedValue(apiError(400, { detail: 'A QR code is only available for approved bookings.' }))
    openBooking()

    expect(await screen.findByText('Could not load the QR code')).toBeInTheDocument()
    expect(screen.getByText('A QR code is only available for approved bookings.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('reports a booking that does not exist', async () => {
    vi.mocked(getReservation).mockRejectedValue(apiError(404, { detail: 'Reservation not found.' }))
    openBooking()

    expect(await screen.findByText('Booking not found')).toBeInTheDocument()
    expect(screen.getByText('Reservation not found.')).toBeInTheDocument()
  })
})
