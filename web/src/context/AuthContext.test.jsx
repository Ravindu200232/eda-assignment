/*
 * File:    AuthContext.test.jsx
 * Module:  Authentication - unit tests
 * Owner:   Ravindu
 * Purpose: Checks login, the prosumer refusal, logout, token expiry and
 *          logouts made in another tab.
 */
import { useState } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentUser, login } from '../api/auth'
import { adminUser, signIn } from '../test/render'
import { AuthProvider, PROSUMER_REFUSED, SESSION_EXPIRED, useAuth } from './AuthContext'
import { SESSION_KEY, endSession, readStoredSession } from './sessionStore'

vi.mock('../api/auth', () => ({ login: vi.fn(), getCurrentUser: vi.fn(), changePassword: vi.fn() }))

const inEightHours = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString()

// Shows the auth state and offers login / logout buttons.
function AuthProbe() {
  const { user, notice, login: logIn, logout } = useAuth()
  const [error, setError] = useState('')

  return (
    <div>
      <p>user: {user ? user.fullName : 'none'}</p>
      <p>notice: {notice ? notice.message : 'none'}</p>
      <p>error: {error}</p>
      <button type="button" onClick={() => logIn('  admin@solargrid.lk ', 'Admin@123').catch((e) => setError(e.message))}>
        log in
      </button>
      <button type="button" onClick={logout}>
        log out
      </button>
    </div>
  )
}

// Draws the probe inside the provider.
function renderProbe() {
  return render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>,
  )
}

beforeEach(() => {
  endSession()
  vi.mocked(getCurrentUser).mockReturnValue(new Promise(() => {}))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AuthProvider', () => {
  it('stores a staff session after login', async () => {
    vi.mocked(login).mockResolvedValue({ token: 'token-1', expiresAt: inEightHours(), user: adminUser })
    renderProbe()

    await userEvent.click(screen.getByRole('button', { name: 'log in' }))

    expect(await screen.findByText('user: System Administrator')).toBeInTheDocument()
    expect(login).toHaveBeenCalledWith('admin@solargrid.lk', 'Admin@123')
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)).token).toBe('token-1')
  })

  it('refuses prosumer accounts and keeps no token', async () => {
    vi.mocked(login).mockResolvedValue({
      token: 'token-2',
      expiresAt: inEightHours(),
      user: { ...adminUser, role: 'Prosumer', fullName: 'Kasun Perera' },
    })
    renderProbe()

    await userEvent.click(screen.getByRole('button', { name: 'log in' }))

    expect(await screen.findByText(`error: ${PROSUMER_REFUSED}`)).toBeInTheDocument()
    expect(screen.getByText('user: none')).toBeInTheDocument()
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('logs out and leaves a message for the login page', async () => {
    signIn(adminUser)
    renderProbe()

    await userEvent.click(screen.getByRole('button', { name: 'log out' }))

    expect(screen.getByText('user: none')).toBeInTheDocument()
    expect(screen.getByText('notice: You have logged out. See you soon!')).toBeInTheDocument()
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('ignores a saved session that has expired', () => {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ token: 'old', expiresAt: new Date(Date.now() - 1000).toISOString(), user: adminUser }),
    )
    expect(readStoredSession()).toBeNull()
  })

  it('signs out when the token time is up', () => {
    vi.useFakeTimers()
    signIn(adminUser, 1)
    renderProbe()
    expect(screen.getByText('user: System Administrator')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(3600 * 1000 + 10))

    expect(screen.getByText('user: none')).toBeInTheDocument()
    expect(screen.getByText(`notice: ${SESSION_EXPIRED}`)).toBeInTheDocument()
  })

  it('refreshes the user details from the API', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ ...adminUser, fullName: 'Admin Renamed' })
    signIn(adminUser)
    renderProbe()

    expect(await screen.findByText('user: Admin Renamed')).toBeInTheDocument()
  })

  it('follows a logout made in another tab', () => {
    signIn(adminUser)
    renderProbe()

    localStorage.removeItem(SESSION_KEY)
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: SESSION_KEY })))

    expect(screen.getByText('user: none')).toBeInTheDocument()
    expect(screen.getByText('notice: You were logged out in another tab.')).toBeInTheDocument()
  })
})
