/*
 * File:    App.jsx
 * Module:  Core
 * Owner:   Ravindu
 * Purpose: Puts the app together: session and toast providers around the router.
 */
import { useState } from 'react'
import { RouterProvider } from 'react-router/dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { createAppRouter } from './routes/router'

// Root component.
export default function App() {
  const [router] = useState(createAppRouter)

  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  )
}
