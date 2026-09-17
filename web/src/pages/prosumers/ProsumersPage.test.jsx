/*
 * File:    ProsumersPage.test.jsx
 * Module:  Prosumer Accounts - unit tests
 * Owner:   Malith
 * Purpose: Checks the prosumer list, the status filter, role-based buttons
 *          (only Backoffice activates) and creating an account.
 */
import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createProsumer, deactivateProsumer, listProsumers } from '../../api/prosumers'
import { apiError, pageOf } from '../../test/apiError'
import { adminUser, operatorUser, renderPage } from '../../test/render'
import { activeProsumer, deactivatedProsumer, pendingProsumer } from '../../test/samples'
import ProsumersPage from './ProsumersPage'

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

// Finds the table row of a prosumer.
const rowOf = (name) => screen.getByRole('link', { name }).closest('tr')

beforeEach(() => {
  vi.mocked(listProsumers).mockResolvedValue(pageOf([activeProsumer, pendingProsumer, deactivatedProsumer]))
})

describe('ProsumersPage', () => {
  it('lists prosumers with their solar details and status', async () => {
    renderPage(<ProsumersPage />, { path: '/prosumers', user: adminUser })

    expect(await screen.findByRole('link', { name: 'Kasun Perera' })).toHaveAttribute('href', '/prosumers/200034501234')
    expect(within(rowOf('Kasun Perera')).getByText('5.5 kW')).toBeInTheDocument()
    expect(within(rowOf('Kasun Perera')).getByText('CEB-MLB-10021')).toBeInTheDocument()
    expect(within(rowOf('Dilani Fernando')).getByText('No meter number')).toBeInTheDocument()
    expect(within(rowOf('Tharindu Jayasinghe')).getByText('Pending')).toBeInTheDocument()
  })

  it('sends the chosen status to the API', async () => {
    const { events } = renderPage(<ProsumersPage />, { path: '/prosumers', user: adminUser })
    await screen.findByRole('link', { name: 'Kasun Perera' })

    await events.click(screen.getByRole('tab', { name: 'Waiting for activation' }))

    await waitFor(() => expect(listProsumers).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'Pending', page: 1 })))
  })

  it('lets Backoffice users activate and reactivate accounts', async () => {
    renderPage(<ProsumersPage />, { path: '/prosumers', user: adminUser })
    await screen.findByRole('link', { name: 'Kasun Perera' })

    expect(within(rowOf('Tharindu Jayasinghe')).getByRole('button', { name: 'Activate' })).toBeInTheDocument()
    expect(within(rowOf('Tharindu Jayasinghe')).getByRole('button', { name: 'Reject' })).toBeInTheDocument()
    expect(within(rowOf('Dilani Fernando')).getByRole('button', { name: 'Reactivate' })).toBeInTheDocument()
    expect(within(rowOf('Kasun Perera')).getByRole('button', { name: 'Deactivate' })).toBeInTheDocument()
  })

  it('never shows activation buttons to Grid Operators', async () => {
    renderPage(<ProsumersPage />, { path: '/prosumers', user: operatorUser })
    await screen.findByRole('link', { name: 'Kasun Perera' })

    expect(screen.queryByRole('button', { name: 'Activate' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reactivate' })).not.toBeInTheDocument()
    expect(within(rowOf('Dilani Fernando')).getByText('Only Backoffice can reactivate')).toBeInTheDocument()
    expect(within(rowOf('Kasun Perera')).getByRole('button', { name: 'Deactivate' })).toBeInTheDocument()
  })

  it('shows why a deactivation was refused', async () => {
    vi.mocked(deactivateProsumer).mockRejectedValue(
      apiError(400, { detail: 'This account has upcoming reservations. Cancel them before deactivating.' }),
    )
    const { events } = renderPage(<ProsumersPage />, { path: '/prosumers', user: operatorUser })
    await screen.findByRole('link', { name: 'Kasun Perera' })

    await events.click(within(rowOf('Kasun Perera')).getByRole('button', { name: 'Deactivate' }))
    const dialog = screen.getByRole('dialog', { name: 'Deactivate this account?' })
    await events.click(within(dialog).getByRole('button', { name: 'Deactivate' }))

    expect(deactivateProsumer).toHaveBeenCalledWith('200034501234')
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('This account has upcoming reservations.')
  })

  it('creates an active prosumer with optional fields left empty', async () => {
    vi.mocked(createProsumer).mockResolvedValue({ ...activeProsumer, fullName: 'Amaya Ranasinghe' })
    const { events } = renderPage(<ProsumersPage />, { path: '/prosumers', user: operatorUser })
    await screen.findByRole('link', { name: 'Kasun Perera' })

    await events.click(screen.getByRole('button', { name: 'New prosumer' }))
    const dialog = screen.getByRole('dialog', { name: 'New prosumer' })
    await events.type(within(dialog).getByLabelText(/^NIC/), '199612345678')
    await events.type(within(dialog).getByLabelText(/^Full name/), 'Amaya Ranasinghe')
    await events.type(within(dialog).getByLabelText(/^Email/), 'amaya@example.com')
    await events.type(within(dialog).getByLabelText(/^Phone/), '0777654321')
    await events.type(within(dialog).getByLabelText(/^Home address/), 'No. 5, Lake Road, Kurunegala')
    await events.type(within(dialog).getByLabelText(/^Password/), 'Prosumer@456')
    await events.click(within(dialog).getByRole('button', { name: 'Create account' }))

    expect(createProsumer).toHaveBeenCalledWith({
      nic: '199612345678',
      fullName: 'Amaya Ranasinghe',
      email: 'amaya@example.com',
      phone: '0777654321',
      address: 'No. 5, Lake Road, Kurunegala',
      meterNumber: null,
      solarCapacityKw: null,
      password: 'Prosumer@456',
    })
    expect(await screen.findByText("Amaya Ranasinghe's account is ready to use.")).toBeInTheDocument()
  })
})
