/*
 * File:    AuthContext.jsx
 * Module:  Authentication
 * Owner:   Ravindu
 * Purpose: Gives every screen the signed-in staff user and the login and
 *          logout actions. It refuses prosumer accounts (they use the mobile
 *          app) and signs the user out when the token expires.
 * Source:  WEB-06 (React context), WEB-20 (storage event for other tabs).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from 'react'
import { getCurrentUser, login as loginRequest } from '../api/auth'
import { STAFF_ROLES } from '../utils/roles'
import {
  SESSION_KEY,
  clearNotice,
  endSession,
  getAuthState,
  startSession,
  subscribeAuth,
  syncFromStorage,
  updateSessionUser,
} from './sessionStore'

export const PROSUMER_REFUSED =
  'This portal is for Backoffice and Grid Operator staff. Prosumers can manage their bookings in the Smart Solar mobile app.'
export const SESSION_EXPIRED = 'Your session has expired. Please log in again.'

const AuthContext = createContext(null)

// Provides the session to the app.
export function AuthProvider({ children }) {
  const { session, notice } = useSyncExternalStore(subscribeAuth, getAuthState)
  const token = session?.token

  // Signs out automatically when the token's time is up.
  useEffect(() => {
    if (!session) return undefined
    const msLeft = Date.parse(session.expiresAt) - Date.now()
    const timer = setTimeout(() => endSession({ tone: 'warning', message: SESSION_EXPIRED }), Math.max(msLeft, 0))
    return () => clearTimeout(timer)
  }, [session])

  // Refreshes the user once per token, so name or role changes show up.
  // A rejected token is handled by the API client (it ends the session).
  useEffect(() => {
    if (!token) return
    getCurrentUser()
      .then(updateSessionUser)
      .catch(() => {})
  }, [token])

  // Follows logins and logouts made in other tabs.
  useEffect(() => {
    // Reacts only to changes of the saved session.
    const onStorage = (event) => {
      if (event.key === SESSION_KEY || event.key === null) syncFromStorage()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Logs in and keeps the session only for staff accounts.
  const login = useCallback(async (username, password) => {
    const result = await loginRequest(username.trim(), password)
    if (!STAFF_ROLES.includes(result.user?.role)) {
      throw new Error(PROSUMER_REFUSED)
    }
    startSession({ token: result.token, expiresAt: result.expiresAt, user: result.user })
    return result.user
  }, [])

  // Signs out on request.
  const logout = useCallback(() => {
    endSession({ tone: 'success', message: 'You have logged out. See you soon!' })
  }, [])

  // Loads the latest details of the signed-in user.
  const refreshUser = useCallback(async () => {
    const user = await getCurrentUser()
    updateSessionUser(user)
    return user
  }, [])

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      expiresAt: session?.expiresAt ?? null,
      isAuthenticated: Boolean(session),
      notice,
      login,
      logout,
      refreshUser,
      clearNotice,
    }),
    [session, notice, login, logout, refreshUser],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

// Reads the auth context. Must be used inside <AuthProvider>.
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.')
  return context
}
