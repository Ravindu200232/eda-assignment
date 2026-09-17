/*
 * File:    LoginPage.test.jsx
 * Module:  Authentication - unit tests
 * Owner:   Ravindu
 * Purpose: Checks the role-based redirect after login, the prosumer refusal
 *          and how API errors are shown on the form.
 */
import { act, screen } from '@testing-library/react'
import { useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { login } from '../../api/auth'
import { PROSUMER_REFUSED, SESSION_EXPIRED } from '../../context/AuthContext'
import { SESSION_KEY, endSession } from '../../context/sessionStore'
import { RedirectIfSignedIn } from '../../routes/guards'
import { homePathFor } from '../../routes/navigation'
import { apiError } from '../../test/apiError'
import { adminUser, operatorUser, renderRoutes } from '../../test/render'
import LoginPage from './LoginPage'

vi.mock('../../api/auth', () => ({ login: vi.fn(), getCurrentUser: vi.fn(() => new Promise(() => {})), changePassword: vi.fn() }))

// Prints the address the user was sent to.
function Landing() {
  return <p>Landed on {useLocation().pathname}</p>
}

const routes = [
  {
    path: '/login',
    element: (
      <RedirectIfSignedIn>
        <LoginPage />
      </RedirectIfSignedIn>
    ),
  },
  { path: '*', element: <Landing /> },
]

const tokenFor = (user) => ({ token: 'token', expiresAt: new Date(Date.now() + 3600e3).toISOString(), user })

// Opens the login page and fills in the form.
async function submitLogin(username = 'admin@solargrid.lk', password = 'Admin@123') {
  const view = renderRoutes(routes, { path: '/login', user: null })
  if (username) await view.events.type(screen.getByLabelText(/^NIC or email/), username)
  if (password) await view.events.type(screen.getByLabelText(/^Password/), password)
  await view.events.click(screen.getByRole('button', { name: 'Log in' }))
  return view
}

describe('LoginPage', () => {
  it('sends a Backoffice user to the Backoffice home page', async () => {
    vi.mocked(login).mockResolvedValue(tokenFor(adminUser))
    await submitLogin()

    expect(await screen.findByText(`Landed on ${homePathFor('Backoffice')}`)).toBeInTheDocument()
    expect(login).toHaveBeenCalledWith('admin@solargrid.lk', 'Admin@123')
  })

  it('sends a Grid Operator to the operator home page', async () => {
    vi.mocked(login).mockResolvedValue(tokenFor(operatorUser))
    await submitLogin('199023456789', 'Operator@123')

    expect(await screen.findByText(`Landed on ${homePathFor('GridOperator')}`)).toBeInTheDocument()
  })

  it('refuses a prosumer account', async () => {
    vi.mocked(login).mockResolvedValue(tokenFor({ ...adminUser, role: 'Prosumer' }))
    await submitLogin('kasun@example.com', 'Prosumer@123')

    expect(await screen.findByRole('alert')).toHaveTextContent(PROSUMER_REFUSED)
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled()
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('shows the API message for a wrong password', async () => {
    vi.mocked(login).mockRejectedValue(apiError(401, { detail: 'Incorrect NIC/email or password.' }))
    await submitLogin('admin@solargrid.lk', 'wrong')

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect NIC/email or password.')
  })

  it('shows field problems under the inputs', async () => {
    vi.mocked(login).mockRejectedValue(
      apiError(400, {
        detail: 'Enter your password.',
        errors: { Username: ['Enter your NIC or email.'], Password: ['Enter your password.'] },
      }),
    )
    await submitLogin('', '')

    expect(await screen.findByText('Enter your NIC or email.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^NIC or email/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Please check the highlighted fields.')
  })

  it('explains why the user was signed out', () => {
    renderRoutes(routes, { path: '/login', user: null })
    act(() => endSession({ tone: 'warning', message: SESSION_EXPIRED }))

    expect(screen.getByRole('status')).toHaveTextContent(SESSION_EXPIRED)
  })
})
