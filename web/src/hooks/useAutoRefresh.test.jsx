/*
 * File:    useAutoRefresh.test.jsx
 * Module:  Dashboards - unit tests
 * Owner:   Malith
 * Purpose: Checks that dashboards refresh on a timer only while visible.
 */
import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAutoRefresh } from './useAutoRefresh'

// Uses the hook with a short interval.
function Probe({ onTick }) {
  useAutoRefresh(onTick, 1000)
  return null
}

// Pretends the browser tab is shown or hidden.
function setVisibility(state) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
}

afterEach(() => {
  vi.useRealTimers()
  setVisibility('visible')
})

describe('useAutoRefresh', () => {
  it('refreshes on a timer while the page is visible', () => {
    vi.useFakeTimers()
    const tick = vi.fn()
    render(<Probe onTick={tick} />)

    act(() => vi.advanceTimersByTime(3000))

    expect(tick).toHaveBeenCalledTimes(3)
  })

  it('waits while the tab is hidden and refreshes when the user returns', () => {
    vi.useFakeTimers()
    setVisibility('hidden')
    const tick = vi.fn()
    render(<Probe onTick={tick} />)

    act(() => vi.advanceTimersByTime(3000))
    expect(tick).not.toHaveBeenCalled()

    setVisibility('visible')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(tick).toHaveBeenCalledTimes(1)
  })

  it('stops when the page closes', () => {
    vi.useFakeTimers()
    const tick = vi.fn()
    const { unmount } = render(<Probe onTick={tick} />)

    unmount()
    act(() => vi.advanceTimersByTime(3000))

    expect(tick).not.toHaveBeenCalled()
  })
})
