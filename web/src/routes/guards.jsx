/*
 * File:    guards.jsx
 * Module:  Core (navigation)
 * Owner:   Ravindu
 * Purpose: Route guards. They check sign-in and role before a page is shown.
 *          The API checks the same rules again on every request.
 * Source:  WEB-04 (React Router Navigate and Outlet).
 */
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../context/AuthContext'
import ForbiddenPage from '../pages/errors/ForbiddenPage'
import { hasRole } from '../utils/roles'
import { pathAfterLogin } from './navigation'

// Sends signed-out visitors to the login page and remembers where they were going.
export function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }
  return children
}

// Shows the "not allowed" page when the user's role may not open these routes.
export function RequireRole({ roles }) {
  const { user } = useAuth()
  return hasRole(user, roles) ? <Outlet /> : <ForbiddenPage roles={roles} />
}

// Moves signed-in staff from the login page to where they wanted to go.
export function RedirectIfSignedIn({ children }) {
  const { user } = useAuth()
  const location = useLocation()

  if (user) {
    return <Navigate to={pathAfterLogin(location.state?.from, user.role)} replace />
  }
  return children
}
