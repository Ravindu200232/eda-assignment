/*
 * File:    NavBadgesContext.test.jsx
 * Module:  Dashboards - unit tests
 * Owner:   Malith
 * Purpose: Checks the "sign-ups waiting" counter in the side menu and the
 *          menu entries each role sees.
 */
import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getStaffSummary } from '../api/dashboard'
import AppLayout from '../layouts/AppLayout'
import { adminUser, operatorUser, renderRoutes } from '../test/render'
import { staffSummary } from '../test/samples'
import { NavBadgesProvider } from './NavBadgesContext'

vi.mock('../api/auth', () => ({ login: vi.fn(), getCurrentUser: vi.fn(() => new Promise(() => {})), changePassword: vi.fn() }))
vi.mock('../api/health', () => ({ getHealth: vi.fn(() => new Promise(() => {})) }))
vi.mock('../api/dashboard', () => ({ getPublicSummary: vi.fn(), getStaffSummary: vi.fn(), getBookingsForDay: vi.fn() }))

// The signed-in frame with the counters, like the real router uses it.
const routes = [
  {
    element: (
      <NavBadgesProvider>
        <AppLayout />
      </NavBadgesProvider>
    ),
    children: [{ path: '*', element: <p>Page body</p> }],
  },
]

describe('side menu counters', () => {
  it('shows how many sign-ups wait for a Backoffice user', async () => {
    vi.mocked(getStaffSummary).mockResolvedValue(staffSummary({ pendingActivations: 2 }))
    renderRoutes(routes, { path: '/dashboard', user: adminUser })

    const menu = screen.getByRole('navigation', { name: 'Main menu' })
    const link = within(menu).getByRole('link', { name: /Pending activations/ })
    expect(await within(link).findByText('2')).toBeInTheDocument()
    expect(link).toHaveAccessibleName('Pending activations (2 waiting)')
    expect(within(menu).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard')
  })

  it('shows no counter when nothing is waiting', async () => {
    vi.mocked(getStaffSummary).mockResolvedValue(staffSummary({ pendingActivations: 0 }))
    renderRoutes(routes, { path: '/dashboard', user: adminUser })

    const menu = screen.getByRole('navigation', { name: 'Main menu' })
    await vi.waitFor(() => expect(getStaffSummary).toHaveBeenCalled())
    expect(within(menu).getByRole('link', { name: 'Pending activations' })).toBeInTheDocument()
  })

  it('gives Grid Operators their own menu without counters', () => {
    renderRoutes(routes, { path: '/operations', user: operatorUser })

    const menu = screen.getByRole('navigation', { name: 'Main menu' })
    expect(within(menu).getByRole('link', { name: 'Operations' })).toHaveAttribute('href', '/operations')
    expect(within(menu).getByRole('link', { name: 'Prosumers' })).toBeInTheDocument()
    expect(within(menu).queryByRole('link', { name: /Pending activations/ })).not.toBeInTheDocument()
    expect(within(menu).queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument()
    expect(getStaffSummary).not.toHaveBeenCalled()
  })
})
