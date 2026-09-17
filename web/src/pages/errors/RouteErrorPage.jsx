/*
 * File:    RouteErrorPage.jsx
 * Module:  Core pages
 * Owner:   Ravindu
 * Purpose: Catches unexpected errors while a page loads or draws, so the user
 *          sees a friendly screen instead of a blank page.
 * Source:  WEB-04 (React Router errorElement and useRouteError).
 */
import { ServerCrash } from 'lucide-react'
import { isRouteErrorResponse, useRouteError } from 'react-router'
import Button from '../../components/ui/Button'
import ErrorScreen from './ErrorScreen'

// Error screen with a reload button.
export default function RouteErrorPage() {
  const error = useRouteError()

  // A missing page file usually means a new version was deployed.
  const isOldVersion = /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(String(error?.message ?? ''))
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : isOldVersion
      ? 'A newer version of the portal is available. Reload the page to continue.'
      : 'Something unexpected happened while showing this page. Reloading usually fixes it.'

  return (
    <ErrorScreen
      code="Oops"
      icon={ServerCrash}
      color="amber"
      title="This page could not be shown"
      message={message}
      actionLabel="Reload page"
      onAction={() => window.location.reload()}
      secondary={
        <Button variant="ghost" onClick={() => window.location.assign('#/')}>
          Go to the start page
        </Button>
      }
      fullScreen
    />
  )
}
