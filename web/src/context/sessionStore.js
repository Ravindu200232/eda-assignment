/*
 * File:    sessionStore.js
 * Module:  Authentication
 * Owner:   Ravindu
 * Purpose: Holds the signed-in session (token, expiry and user) outside React,
 *          so the API client can read the token before any page loads data.
 *          The session is kept in localStorage so a page refresh keeps you
 *          signed in until the token expires.
 * Source:  WEB-20 (Web Storage API).
 */

export const SESSION_KEY = 'solargrid.session'

const listeners = new Set()
let state = { session: readStoredSession(), notice: null }

// Reads the saved session and ignores it when it is broken or expired.
export function readStoredSession(now = Date.now()) {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY))
    const valid = session?.token && session.user && Date.parse(session.expiresAt) > now
    return valid ? session : null
  } catch {
    return null
  }
}

// Saves or removes the session. Storage can be blocked in private windows.
function persist(session) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // The session still works for this tab without storage.
  }
}

// Replaces the state and tells subscribers.
function update(next) {
  state = next
  listeners.forEach((listener) => listener())
}

// Current { session, notice } for useSyncExternalStore.
export function getAuthState() {
  return state
}

// Registers a change listener and returns the unsubscribe function.
export function subscribeAuth(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Token for the API client, or null when signed out.
export function getToken() {
  return state.session?.token ?? null
}

// Stores a new session after a successful login.
export function startSession(session) {
  persist(session)
  update({ session, notice: null })
}

// Signs out. `notice` ({ tone, message }) is shown on the login page.
export function endSession(notice = null) {
  persist(null)
  update({ session: null, notice })
}

// Keeps the stored user details up to date.
export function updateSessionUser(user) {
  if (!state.session || !user) return
  const session = { ...state.session, user }
  persist(session)
  update({ ...state, session })
}

// Removes the login page message once it has been seen.
export function clearNotice() {
  if (state.notice) update({ ...state, notice: null })
}

// Picks up a login or logout made in another browser tab.
export function syncFromStorage() {
  const session = readStoredSession()
  if (session?.token === state.session?.token) return
  update({
    session,
    notice: session ? null : { tone: 'info', message: 'You were logged out in another tab.' },
  })
}
