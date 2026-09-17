/*
 * File:    NavBadgesContext.jsx
 * Module:  Dashboards
 * Owner:   Malith
 * Purpose: Small counters in the side menu, such as the number of sign-ups
 *          waiting for activation. Pages call refresh() after a change.
 * Source:  WEB-06 (React context).
 */
import { createContext, useContext, useMemo } from 'react'
import { getStaffSummary } from '../api/dashboard'
import { useApi } from '../hooks/useApi'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { Roles } from '../utils/roles'
import { useAuth } from './AuthContext'

const NavBadgesContext = createContext({ badges: {}, refresh: () => {} })

// Loads the menu counters. Only Backoffice users have counters today.
export function NavBadgesProvider({ children }) {
  const { user } = useAuth()
  const isBackoffice = user?.role === Roles.Backoffice
  const summary = useApi(() => (isBackoffice ? getStaffSummary() : Promise.resolve(null)), [isBackoffice])
  useAutoRefresh(summary.reload, 60000)

  // A failed refresh keeps the last numbers; the dashboard shows connection problems.
  const waiting = summary.data?.pendingActivations
  const value = useMemo(
    () => ({ badges: waiting ? { '/activations': waiting } : {}, refresh: summary.reload }),
    [waiting, summary.reload],
  )

  return <NavBadgesContext value={value}>{children}</NavBadgesContext>
}

// Returns { badges, refresh }.
export function useNavBadges() {
  return useContext(NavBadgesContext)
}
