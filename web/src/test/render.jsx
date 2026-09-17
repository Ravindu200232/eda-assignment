/*
 * File:    render.jsx
 * Module:  Unit tests
 * Owner:   Ravindu
 * Purpose: Helpers that draw a page with the same providers as the real app
 *          (session, toasts, router) and sample staff users.
 * Source:  WEB-12 (Testing Library render), WEB-04 (memory router).
 */
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { AuthProvider } from '../context/AuthContext'
import { ToastProvider } from '../context/ToastContext'
import { endSession, startSession } from '../context/sessionStore'

export const adminUser = {
  nic: '198512345678',
  fullName: 'System Administrator',
  email: 'admin@solargrid.lk',
  phone: '0112345678',
  role: 'Backoffice',
  status: 'Active',
  createdAt: '2026-09-01T04:00:00Z',
  lastLoginAt: '2026-09-17T02:30:00Z',
}

export const operatorUser = {
  nic: '199023456789',
  fullName: 'Nimal Bandara',
  email: 'operator@solargrid.lk',
  phone: '0771234567',
  role: 'GridOperator',
  status: 'Active',
  createdAt: '2026-09-01T04:00:00Z',
  lastLoginAt: null,
}

// Signs a user in (or out when `user` is null) before a test renders.
export function signIn(user, hoursLeft = 8) {
  if (!user) {
    endSession()
    return
  }
  startSession({
    token: `test-token-${user.nic}`,
    expiresAt: new Date(Date.now() + hoursLeft * 3600 * 1000).toISOString(),
    user,
  })
}

// Renders routes inside the app providers, starting at `path`.
export function renderRoutes(routes, { path = '/', user = adminUser } = {}) {
  signIn(user)
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const result = render(
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>,
  )
  return { ...result, router, events: userEvent.setup() }
}

// Renders one page element at `path` (the page may use route params).
export function renderPage(element, { path = '/', route = path, user } = {}) {
  return renderRoutes(
    [
      { path: route, element },
      { path: '*', element: <p>Other page</p> },
    ],
    { path, user },
  )
}
