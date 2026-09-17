/*
 * File:    ForbiddenPage.jsx
 * Module:  Core pages
 * Owner:   Ravindu
 * Purpose: Shown inside the portal when a user's role may not open a page
 *          (for example a Grid Operator opening Staff users).
 */
import { ShieldX } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { homePathFor } from '../../routes/navigation'
import { formatLabel } from '../../utils/format'
import ErrorScreen from './ErrorScreen'

// 403 page for signed-in users.
export default function ForbiddenPage() {
  const { user } = useAuth()

  return (
    <ErrorScreen
      code="403"
      icon={ShieldX}
      color="pink"
      title="This page is for Backoffice staff"
      message={`You are signed in as a ${formatLabel(user.role)}, so this area is not available to you.`}
      actionLabel="Back to my dashboard"
      actionTo={homePathFor(user.role)}
    />
  )
}
