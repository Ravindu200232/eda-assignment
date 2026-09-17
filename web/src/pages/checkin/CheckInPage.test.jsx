/*
 * File:    CheckInPage.test.jsx
 * Module:  Operator Check-in - unit tests
 * Owner:   Ravindu
 * Purpose: Checks reading a code (typed, USB scanner or camera), the result
 *          shown to the operator and completing the transfer.
 */
import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { completeTransfer, verifyQrCode } from '../../api/checkin'
import { apiError } from '../../test/apiError'
import { operatorUser, renderPage } from '../../test/render'
import CheckInPage from './CheckInPage'

vi.mock('../../api/auth', () => ({ login: vi.fn(), getCurrentUser: vi.fn(() => new Promise(() => {})), changePassword: vi.fn() }))
vi.mock('../../api/checkin', () => ({ verifyQrCode: vi.fn(), completeTransfer: vi.fn() }))
vi.mock('./CameraScanner', () => ({
  default: ({ onScan }) => (
    <button type="button" onClick={() => onScan('SSG1.from.the.camera')}>
      Pretend camera read
    </button>
  ),
}))

const CODE = 'SSG1.66e9a1b2c3d4e5f601234567.A1B2C3D4E5F60718.c2lnbmF0dXJl'

const reservation = {
  id: '66e9a1b2c3d4e5f601234567',
  referenceNo: 'RSV-DEMO-0006',
  prosumerNic: '995671234V',
  prosumerName: 'Nadeesha Silva',
  stationName: 'SLIIT Malabe Campus Microgrid',
  startTime: '2026-09-17T02:30:00Z',
  endTime: '2026-09-17T04:30:00Z',
  tradeType: 'Import',
  energyKwh: 4,
  status: 'Approved',
}

const readyCheck = {
  canComplete: true,
  message: 'Valid booking. Nadeesha Silva can import up to 4 kWh.',
  prosumerPhone: '0723456789',
  checkInOpensAt: '2026-09-17T00:30:00Z',
  checkInClosesAt: '2026-09-17T05:30:00Z',
  reservation,
}

// Opens the page as a Grid Operator and types a code followed by Enter.
async function scan(code = CODE) {
  const view = renderPage(<CheckInPage />, { path: '/check-in', user: operatorUser })
  await view.events.type(screen.getByLabelText(/^QR code text/), `${code}{Enter}`)
  return view
}

describe('CheckInPage', () => {
  it('checks the scanned code and completes the transfer', async () => {
    vi.mocked(verifyQrCode).mockResolvedValue(readyCheck)
    vi.mocked(completeTransfer).mockResolvedValue({
      ...reservation,
      status: 'Completed',
      deliveredKwh: 3.5,
      completedAt: '2026-09-17T03:10:00Z',
    })
    const { events } = await scan()

    expect(verifyQrCode).toHaveBeenCalledWith(CODE)
    expect(await screen.findByText('Ready to transfer')).toBeInTheDocument()
    expect(screen.getByText('Nadeesha Silva (995671234V)')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '0723456789' })).toHaveAttribute('href', 'tel:0723456789')

    const delivered = screen.getByLabelText(/^Delivered energy/)
    expect(delivered).toHaveValue(4)
    await events.clear(delivered)
    await events.type(delivered, '3.5')
    await events.click(screen.getByRole('button', { name: 'Complete transfer' }))

    const dialog = screen.getByRole('dialog', { name: 'Complete this transfer?' })
    await events.click(within(dialog).getByRole('button', { name: 'Complete transfer' }))

    expect(completeTransfer).toHaveBeenCalledWith(reservation.id, CODE, 3.5)
    expect(await screen.findByRole('heading', { name: 'Transfer completed' })).toBeInTheDocument()
    expect(screen.getByText('Completed this session')).toBeInTheDocument()
  })

  it('explains why a booking cannot be completed yet', async () => {
    vi.mocked(verifyQrCode).mockResolvedValue({
      ...readyCheck,
      canComplete: false,
      message: 'Check-in for this booking opens at 06:30 on 18 Sep 2026.',
    })
    await scan()

    expect(await screen.findByText('Cannot complete yet')).toBeInTheDocument()
    expect(screen.getByText('Check-in for this booking opens at 06:30 on 18 Sep 2026.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Complete transfer' })).not.toBeInTheDocument()
  })

  it('shows the API reason for a forged or old code', async () => {
    vi.mocked(verifyQrCode).mockRejectedValue(apiError(400, { detail: 'This QR code is not genuine.' }))
    await scan('SSG1.fake')

    expect(await screen.findByRole('alert')).toHaveTextContent('This QR code is not genuine.')
  })

  it('shows the API reason when completing fails', async () => {
    vi.mocked(verifyQrCode).mockResolvedValue(readyCheck)
    vi.mocked(completeTransfer).mockRejectedValue(
      apiError(400, { detail: 'Delivered energy must be more than 0 and at most 50 kWh.' }),
    )
    const { events } = await scan()
    await screen.findByText('Ready to transfer')

    await events.click(screen.getByRole('button', { name: 'Complete transfer' }))
    const dialog = screen.getByRole('dialog')
    await events.click(within(dialog).getByRole('button', { name: 'Complete transfer' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('at most 50 kWh')
  })

  it('checks a code read by the camera straight away', async () => {
    vi.mocked(verifyQrCode).mockResolvedValue(readyCheck)
    const { events } = renderPage(<CheckInPage />, { path: '/check-in', user: operatorUser })

    await events.click(screen.getByRole('button', { name: 'Scan with camera' }))
    const dialog = screen.getByRole('dialog', { name: 'Scan with camera' })
    await events.click(await within(dialog).findByRole('button', { name: 'Pretend camera read' }))

    expect(verifyQrCode).toHaveBeenCalledWith('SSG1.from.the.camera')
    expect(screen.getByLabelText(/^QR code text/)).toHaveValue('SSG1.from.the.camera')
    expect(await screen.findByText('Ready to transfer')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('asks for a code before calling the API', async () => {
    const { events } = renderPage(<CheckInPage />, { path: '/check-in', user: operatorUser })

    await events.click(screen.getByRole('button', { name: 'Check code' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Scan or paste the QR code first.')
    expect(verifyQrCode).not.toHaveBeenCalled()
  })
})
