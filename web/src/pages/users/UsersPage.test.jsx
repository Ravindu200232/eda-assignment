/*
 * File:    UsersPage.test.jsx
 * Module:  Staff Users - unit tests
 * Owner:   Ravindu
 * Purpose: Checks the staff list, the filters sent to the API, creating an
 *          account and the rule that you cannot deactivate yourself.
 */
import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createUser, listUsers, setUserStatus } from '../../api/users'
import { apiError, pageOf } from '../../test/apiError'
import { adminUser, operatorUser, renderPage } from '../../test/render'
import UsersPage from './UsersPage'

vi.mock('../../api/auth', () => ({ login: vi.fn(), getCurrentUser: vi.fn(() => new Promise(() => {})), changePassword: vi.fn() }))
vi.mock('../../api/users', () => ({
  listUsers: vi.fn(),
  getUser: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  setUserStatus: vi.fn(),
}))

// Finds the table row that contains the given name.
const rowOf = (name) => screen.getByText(name).closest('tr')

beforeEach(() => {
  vi.mocked(listUsers).mockResolvedValue(pageOf([adminUser, operatorUser]))
})

describe('UsersPage', () => {
  it('lists staff users with their role and status', async () => {
    renderPage(<UsersPage />, { path: '/users' })

    expect(await screen.findByText('Nimal Bandara')).toBeInTheDocument()
    expect(within(rowOf('Nimal Bandara')).getByText('Grid Operator')).toBeInTheDocument()
    expect(within(rowOf('Nimal Bandara')).getByText('Active')).toBeInTheDocument()
    expect(within(rowOf('Nimal Bandara')).getByText('Never')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Pages' })).toHaveTextContent('2 staff users · page 1 of 1')
  })

  it('does not offer to deactivate your own account', async () => {
    renderPage(<UsersPage />, { path: '/users' })
    await screen.findByText('Nimal Bandara')

    const myRow = rowOf('System Administrator')
    expect(within(myRow).getByText('You')).toBeInTheDocument()
    expect(within(myRow).queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument()
    expect(within(rowOf('Nimal Bandara')).getByRole('button', { name: 'Deactivate' })).toBeInTheDocument()
  })

  it('sends the chosen filters to the API', async () => {
    const { events } = renderPage(<UsersPage />, { path: '/users' })
    await screen.findByText('Nimal Bandara')

    await events.click(screen.getByRole('tab', { name: 'Deactivated' }))
    await events.selectOptions(screen.getByLabelText('Filter by role'), 'GridOperator')

    await waitFor(() =>
      expect(listUsers).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'Deactivated', role: 'GridOperator', page: 1 })),
    )
  })

  it('deactivates another user after confirmation', async () => {
    vi.mocked(setUserStatus).mockResolvedValue({ ...operatorUser, status: 'Deactivated' })
    const { events } = renderPage(<UsersPage />, { path: '/users' })
    await screen.findByText('Nimal Bandara')

    await events.click(within(rowOf('Nimal Bandara')).getByRole('button', { name: 'Deactivate' }))
    const dialog = screen.getByRole('dialog', { name: 'Deactivate this account?' })
    await events.click(within(dialog).getByRole('button', { name: 'Deactivate' }))

    expect(setUserStatus).toHaveBeenCalledWith(operatorUser.nic, false)
    expect(await screen.findByText('Nimal Bandara is now deactivated.')).toBeInTheDocument()
  })

  it('shows the API reason when a status change is refused', async () => {
    vi.mocked(setUserStatus).mockRejectedValue(apiError(400, { detail: 'At least one active Backoffice account is required.' }))
    const { events } = renderPage(<UsersPage />, { path: '/users' })
    await screen.findByText('Nimal Bandara')

    await events.click(within(rowOf('Nimal Bandara')).getByRole('button', { name: 'Deactivate' }))
    const dialog = screen.getByRole('dialog')
    await events.click(within(dialog).getByRole('button', { name: 'Deactivate' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('At least one active Backoffice account is required.')
  })

  it('creates a staff user from the form', async () => {
    vi.mocked(createUser).mockResolvedValue({ ...operatorUser, nic: '200145678901', fullName: 'Sanduni Weerasinghe' })
    const { events } = renderPage(<UsersPage />, { path: '/users' })
    await screen.findByText('Nimal Bandara')

    await events.click(screen.getByRole('button', { name: 'New staff user' }))
    const dialog = screen.getByRole('dialog', { name: 'New staff user' })
    await events.type(within(dialog).getByLabelText(/^NIC/), '200145678901')
    await events.type(within(dialog).getByLabelText(/^Full name/), 'Sanduni Weerasinghe')
    await events.type(within(dialog).getByLabelText(/^Email/), 'sanduni@solargrid.lk')
    await events.type(within(dialog).getByLabelText(/^Phone/), '0712223344')
    await events.type(within(dialog).getByLabelText(/^Password/), 'Operator@456')
    await events.click(within(dialog).getByRole('button', { name: 'Create account' }))

    expect(createUser).toHaveBeenCalledWith({
      nic: '200145678901',
      fullName: 'Sanduni Weerasinghe',
      email: 'sanduni@solargrid.lk',
      phone: '0712223344',
      role: 'GridOperator',
      password: 'Operator@456',
    })
    expect(await screen.findByText('Sanduni Weerasinghe can now log in.')).toBeInTheDocument()
  })

  it('locks the NIC and your own role when editing yourself', async () => {
    const { events } = renderPage(<UsersPage />, { path: '/users' })
    await screen.findByText('Nimal Bandara')

    await events.click(within(rowOf('System Administrator')).getByRole('button', { name: 'Edit System Administrator' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit staff user' })

    expect(within(dialog).getByLabelText(/^NIC/)).toHaveAttribute('readonly')
    expect(within(dialog).getByLabelText(/^Role/)).toBeDisabled()
    expect(within(dialog).getByText('You cannot change your own role.')).toBeInTheDocument()
  })

  it('shows a friendly message when the list cannot load', async () => {
    vi.mocked(listUsers).mockRejectedValue(apiError(503, { detail: 'The database is not reachable right now.' }))
    renderPage(<UsersPage />, { path: '/users' })

    expect(await screen.findByRole('alert')).toHaveTextContent('The database is not reachable right now.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
