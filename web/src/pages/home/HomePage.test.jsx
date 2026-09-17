/*
 * File:    HomePage.test.jsx
 * Module:  Dashboards (public home page) - unit tests
 * Owner:   Malith
 * Purpose: Checks the live numbers, the offline message and the links to login.
 */
import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getPublicSummary } from '../../api/dashboard'
import { apiError } from '../../test/apiError'
import { renderPage } from '../../test/render'
import HomePage from './HomePage'

vi.mock('../../api/auth', () => ({ login: vi.fn(), getCurrentUser: vi.fn(() => new Promise(() => {})), changePassword: vi.fn() }))
vi.mock('../../api/dashboard', () => ({ getPublicSummary: vi.fn(), getStaffSummary: vi.fn(), getBookingsForDay: vi.fn() }))

describe('HomePage', () => {
  it('shows the live numbers from the API', async () => {
    vi.mocked(getPublicSummary).mockResolvedValue({
      activeStations: 4,
      activeProsumers: 12,
      completedTransfers: 31,
      totalEnergyTradedKwh: 1234.6,
    })
    renderPage(<HomePage />, { user: null })

    const numbers = screen.getByRole('region', { name: 'Live from the grid' })
    expect(await within(numbers).findByText('12')).toBeInTheDocument()
    expect(within(numbers).getByText('4')).toBeInTheDocument()
    expect(within(numbers).getByText('31')).toBeInTheDocument()
    expect(within(numbers).getByText('1,235')).toBeInTheDocument()
    expect(document.title).toBe('Smart Solar Microgrid')
  })

  it('still works when the numbers cannot be loaded', async () => {
    vi.mocked(getPublicSummary).mockRejectedValue(apiError(503, { detail: 'The database is not reachable right now.' }))
    renderPage(<HomePage />, { user: null })

    expect(await screen.findByText('Live numbers are not available right now')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument()
  })

  it('leads staff to the login page and explains the steps', async () => {
    vi.mocked(getPublicSummary).mockResolvedValue({ activeStations: 0, activeProsumers: 0, completedTransfers: 0, totalEnergyTradedKwh: 0 })
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const { events } = renderPage(<HomePage />, { user: null })

    expect(screen.getAllByRole('link', { name: /Staff login/ })[0]).toHaveAttribute('href', '/login')
    await events.click(screen.getByRole('button', { name: 'How it works' }))
    expect(scrollIntoView).toHaveBeenCalled()
    expect(screen.getAllByRole('listitem')).toHaveLength(4 + 6)
  })
})
