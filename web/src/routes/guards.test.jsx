/*
 * File:    guards.test.jsx
 * Module:  Core (navigation) - unit tests
 * Owner:   Ravindu
 * Purpose: Checks that pages are only shown to signed-in users with the right
 *          role, and that login returns the user to the page they asked for.
 */
import { act, screen } from '@testing-library/react'
import { Outlet, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { adminUser, operatorUser, renderRoutes, signIn } from '../test/render'
import { Roles } from '../utils/roles'
import { RedirectIfSignedIn, RequireAuth, RequireRole } from './guards'
import { homePathFor } from './navigation'

vi.mock('../api/auth', () => ({ login: vi.fn(), getCurrentUser: vi.fn(() => new Promise(() => {})), changePassword: vi.fn() }))

// Prints the current address so tests can check redirects.
function WhereAmI() {
  const location = useLocation()
  return <p>page {location.pathname}</p>
}

const routes = [
  {
    path: '/login',
    element: (
      <RedirectIfSignedIn>
        <p>Login form</p>
      </RedirectIfSignedIn>
    ),
  },
  {
    element: (
      <RequireAuth>
        <Outlet />
      </RequireAuth>
    ),
    children: [
      { path: '/check-in', element: <WhereAmI /> },
      {
        element: <RequireRole roles={[Roles.Backoffice]} />,
        children: [{ path: '/users', element: <p>Staff users list</p> }],
      },
      { path: '*', element: <WhereAmI /> },
    ],
  },
]

describe('route guards', () => {
  it('sends signed-out visitors to the login page', () => {
    renderRoutes(routes, { path: '/users', user: null })
    expect(screen.getByText('Login form')).toBeInTheDocument()
  })

  it('lets Backoffice users open Backoffice pages', () => {
    renderRoutes(routes, { path: '/users', user: adminUser })
    expect(screen.getByText('Staff users list')).toBeInTheDocument()
  })

  it('shows the not-allowed page to Grid Operators', () => {
    renderRoutes(routes, { path: '/users', user: operatorUser })
    expect(screen.getByRole('heading', { name: 'This page is for Backoffice staff' })).toBeInTheDocument()
    expect(screen.queryByText('Staff users list')).not.toBeInTheDocument()
  })

  it('moves signed-in staff from the login page to their home page', () => {
    const { router } = renderRoutes(routes, { path: '/login', user: operatorUser })
    expect(router.state.location.pathname).toBe(homePathFor(Roles.GridOperator))
  })

  it('returns to the requested page after logging in', () => {
    renderRoutes(routes, { path: '/check-in', user: null })
    expect(screen.getByText('Login form')).toBeInTheDocument()

    act(() => signIn(operatorUser))

    expect(screen.getByText('page /check-in')).toBeInTheDocument()
  })
})
