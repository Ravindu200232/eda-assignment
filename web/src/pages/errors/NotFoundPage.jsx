/*
 * File:    NotFoundPage.jsx
 * Module:  Core pages
 * Owner:   Ravindu
 * Purpose: Shown for addresses that do not exist in the portal.
 */
import { Compass } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { homePathFor } from '../../routes/navigation'
import ErrorScreen from './ErrorScreen'

// 404 page with a way back.
export default function NotFoundPage() {
  const { user } = useAuth()

  return (
    <ErrorScreen
      code="404"
      icon={Compass}
      color="sky"
      title="This page is off the grid"
      message="The address may be mistyped, or the page has moved."
      actionLabel={user ? 'Back to my dashboard' : 'Go to the start page'}
      actionTo={user ? homePathFor(user.role) : '/'}
      fullScreen
    />
  )
}
