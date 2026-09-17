/*
 * File:    PendingActivationsPage.test.jsx
 * Module:  Prosumer Accounts - unit tests
 * Owner:   Malith
 * Purpose: Checks the activation queue: activate, reject with confirmation,
 *          API errors and the empty state.
 */
import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { activateProsumer, deactivateProsumer, listPendingActivations } from '../../api/prosumers'
import { apiError } from '../../test/apiError'
import { renderPage } from '../../test/render'
import { pendingProsumer } from '../../test/samples'
import PendingActivationsPage from './PendingActivationsPage'

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

const second = { ...pendingProsumer, nic: '199934567890', fullName: 'Ishara Wickramasinghe', email: 'ishara@example.com' }

// Opens the queue with two sign-ups.
async function openQueue() {
  vi.mocked(listPendingActivations).mockResolvedValue([pendingProsumer, second])
  const view = renderPage(<PendingActivationsPage />, { path: '/activations' })
  await screen.findByRole('article', { name: 'Sign-up from Tharindu Jayasinghe' })
  return view
}

describe('PendingActivationsPage', () => {
  it('shows each sign-up with its details', async () => {
    await openQueue()

    const card = screen.getByRole('article', { name: 'Sign-up from Tharindu Jayasinghe' })
    expect(within(card).getByText('200112304567')).toBeInTheDocument()
    expect(within(card).getByText('CEB-KAN-30987')).toBeInTheDocument()
    expect(within(card).getByText(/^Signed up /)).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(2)
  })

  it('activates a sign-up and takes it off the list', async () => {
    vi.mocked(activateProsumer).mockResolvedValue({ ...pendingProsumer, status: 'Active' })
    const { events } = await openQueue()

    const card = screen.getByRole('article', { name: 'Sign-up from Tharindu Jayasinghe' })
    await events.click(within(card).getByRole('button', { name: 'Activate' }))

    expect(activateProsumer).toHaveBeenCalledWith('200112304567')
    expect(await screen.findByText('Tharindu Jayasinghe can now log in to the mobile app.')).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Sign-up from Tharindu Jayasinghe' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(1)
  })

  it('rejects a sign-up after confirmation', async () => {
    vi.mocked(deactivateProsumer).mockResolvedValue({ ...second, status: 'Deactivated' })
    const { events } = await openQueue()

    const card = screen.getByRole('article', { name: 'Sign-up from Ishara Wickramasinghe' })
    await events.click(within(card).getByRole('button', { name: 'Reject' }))
    const dialog = screen.getByRole('dialog', { name: 'Reject this sign-up?' })
    await events.click(within(dialog).getByRole('button', { name: 'Reject sign-up' }))

    expect(deactivateProsumer).toHaveBeenCalledWith('199934567890')
    expect(await screen.findByText("Ishara Wickramasinghe's sign-up was rejected.")).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Sign-up from Ishara Wickramasinghe' })).not.toBeInTheDocument()
  })

  it('keeps the sign-up when the API refuses', async () => {
    vi.mocked(activateProsumer).mockRejectedValue(apiError(400, { detail: 'This account is already active.' }))
    const { events } = await openQueue()

    const card = screen.getByRole('article', { name: 'Sign-up from Tharindu Jayasinghe' })
    await events.click(within(card).getByRole('button', { name: 'Activate' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This account is already active.')
    expect(screen.getByRole('article', { name: 'Sign-up from Tharindu Jayasinghe' })).toBeInTheDocument()
  })

  it('says when there is nothing to do', async () => {
    vi.mocked(listPendingActivations).mockResolvedValue([])
    renderPage(<PendingActivationsPage />, { path: '/activations' })

    expect(await screen.findByRole('heading', { name: 'All caught up' })).toBeInTheDocument()
  })
})
