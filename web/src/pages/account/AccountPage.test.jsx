/*
 * File:    AccountPage.test.jsx
 * Module:  Authentication - unit tests
 * Owner:   Ravindu
 * Purpose: Checks the profile details and the password change form.
 */
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { changePassword } from '../../api/auth'
import { apiError } from '../../test/apiError'
import { operatorUser, renderPage } from '../../test/render'
import AccountPage from './AccountPage'

vi.mock('../../api/auth', () => ({ login: vi.fn(), getCurrentUser: vi.fn(() => new Promise(() => {})), changePassword: vi.fn() }))

// Fills in the three password boxes and submits.
async function submitPasswords(events, current, next, repeat) {
  await events.type(screen.getByLabelText(/^Current password/), current)
  await events.type(screen.getByLabelText(/^New password/), next)
  await events.type(screen.getByLabelText(/^Repeat new password/), repeat)
  await events.click(screen.getByRole('button', { name: 'Change password' }))
}

describe('AccountPage', () => {
  it('shows the signed-in user details', () => {
    renderPage(<AccountPage />, { path: '/account', user: operatorUser })

    expect(screen.getByRole('heading', { name: 'Nimal Bandara' })).toBeInTheDocument()
    expect(screen.getByText('199023456789')).toBeInTheDocument()
    expect(screen.getByText('operator@solargrid.lk')).toBeInTheDocument()
    expect(screen.getByText('Ask a Backoffice user if your name, email or phone needs to change.')).toBeInTheDocument()
  })

  it('changes the password and clears the form', async () => {
    vi.mocked(changePassword).mockResolvedValue(undefined)
    const { events } = renderPage(<AccountPage />, { path: '/account', user: operatorUser })

    await submitPasswords(events, 'Operator@123', 'Operator@456', 'Operator@456')

    expect(changePassword).toHaveBeenCalledWith('Operator@123', 'Operator@456')
    expect(await screen.findByText('Your password was changed.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Current password/)).toHaveValue('')
  })

  it('stops when the two new passwords differ', async () => {
    const { events } = renderPage(<AccountPage />, { path: '/account', user: operatorUser })

    await submitPasswords(events, 'Operator@123', 'Operator@456', 'Operator@789')

    expect(screen.getByText('The two new passwords do not match.')).toBeInTheDocument()
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('shows the API message for a wrong current password', async () => {
    vi.mocked(changePassword).mockRejectedValue(apiError(400, { detail: 'Current password is incorrect.' }))
    const { events } = renderPage(<AccountPage />, { path: '/account', user: operatorUser })

    await submitPasswords(events, 'wrong', 'Operator@456', 'Operator@456')

    expect(await screen.findByRole('alert')).toHaveTextContent('Current password is incorrect.')
  })
})
