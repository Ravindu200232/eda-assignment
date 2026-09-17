/*
 * File:    DashboardPage.test.jsx
 * Module:  Dashboards - unit tests
 * Owner:   Malith
 * Purpose: Checks the Backoffice numbers, their links, the next bookings and
 *          the error message.
 */
import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getStaffSummary } from '../../api/dashboard'
import { apiError } from '../../test/apiError'
import { renderPage } from '../../test/render'
import { staffSummary } from '../../test/samples'
import DashboardPage from './DashboardPage'

vi.mock('../../api/auth', () => ({ login: vi.fn(), getCurrentUser: vi.fn(() => new Promise(() => {})), changePassword: vi.fn() }))
vi.mock('../../api/dashboard', () => ({ getPublicSummary: vi.fn(), getStaffSummary: vi.fn(), getBookingsForDay: vi.fn() }))

// Finds the stat orb with the given label.
const orb = (label) => screen.getByText(label, { selector: 'span' }).closest('a, div')

describe('DashboardPage', () => {
  it('shows the live numbers with links to the matching pages', async () => {
    vi.mocked(getStaffSummary).mockResolvedValue(staffSummary())
    renderPage(<DashboardPage />, { path: '/dashboard' })

    const numbers = await screen.findByRole('region', { name: 'Live numbers' })
    expect(await within(numbers).findByText('3')).toBeInTheDocument()
    expect(orb('Waiting for approval')).toHaveAttribute('href', '/reservations?tab=pending')
    expect(within(orb('Approved upcoming')).getByText('7')).toBeInTheDocument()
    expect(within(orb('Sign-ups to activate')).getByText('2')).toBeInTheDocument()
    expect(orb('Sign-ups to activate')).toHaveAttribute('href', '/activations')
    expect(within(orb('Active stations')).getByText('of 5 stations')).toBeInTheDocument()
    expect(within(orb('Active prosumers')).getByText('12')).toBeInTheDocument()
  })

  it('lists the next bookings and the sign-up shortcut', async () => {
    vi.mocked(getStaffSummary).mockResolvedValue(staffSummary())
    renderPage(<DashboardPage />, { path: '/dashboard' })

    const list = await screen.findByRole('list', { name: 'Next bookings' })
    expect(within(list).getByText('Kasun Perera')).toBeInTheDocument()
    expect(within(list).getByRole('link', { name: 'RSV-DEMO-0002' })).toHaveAttribute('href', '/reservations/res-1')
    expect(screen.getByRole('link', { name: 'Review sign-ups (2)' })).toHaveAttribute('href', '/activations')
    expect(screen.getByText(/^Updated /)).toBeInTheDocument()
  })

  it('shows a friendly message when there are no bookings', async () => {
    vi.mocked(getStaffSummary).mockResolvedValue(staffSummary({ upcomingReservations: [] }))
    renderPage(<DashboardPage />, { path: '/dashboard' })

    expect(await screen.findByRole('heading', { name: 'No upcoming bookings' })).toBeInTheDocument()
  })

  it('explains when the numbers cannot be loaded', async () => {
    vi.mocked(getStaffSummary).mockRejectedValue(apiError(503, { detail: 'The database is not reachable right now.' }))
    renderPage(<DashboardPage />, { path: '/dashboard' })

    expect(await screen.findByRole('alert')).toHaveTextContent('The database is not reachable right now.')
  })
})
