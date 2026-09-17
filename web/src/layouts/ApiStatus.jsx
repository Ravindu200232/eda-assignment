/*
 * File:    ApiStatus.jsx
 * Module:  Core layout
 * Owner:   Ravindu
 * Purpose: Small status light in the top bar that shows whether the API and
 *          the database are reachable. Helpful when IIS or MongoDB is down.
 */
import { useEffect, useState } from 'react'
import { API_URL } from '../api/client'
import { getHealth } from '../api/health'
import { cn } from '../utils/cn'

const CHECK_EVERY_MS = 30000

const STATES = {
  checking: { label: 'Checking API…', dot: 'bg-warning' },
  online: { label: 'API online', dot: 'bg-success' },
  noDatabase: { label: 'Database offline', dot: 'bg-danger animate-pulse' },
  offline: { label: 'API offline', dot: 'bg-danger animate-pulse' },
}

// Checks /api/health now and every 30 seconds.
export default function ApiStatus({ className }) {
  const [state, setState] = useState('checking')

  useEffect(() => {
    let active = true

    // Asks the API and stores the result if the component is still shown.
    async function check() {
      let next
      try {
        const health = await getHealth()
        next = health.status === 'Healthy' ? 'online' : 'noDatabase'
      } catch (error) {
        next = error.response?.status === 503 ? 'noDatabase' : 'offline'
      }
      if (active) setState(next)
    }

    check()
    const timer = setInterval(check, CHECK_EVERY_MS)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  const { label, dot } = STATES[state]

  return (
    <span
      role="status"
      title={`${label} (${API_URL})`}
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-full bg-white/80 px-3 font-heading text-xs font-bold text-ink shadow-clay-row',
        className,
      )}
    >
      <span aria-hidden="true" className={cn('size-2.5 rounded-full', dot)} />
      {label}
    </span>
  )
}
