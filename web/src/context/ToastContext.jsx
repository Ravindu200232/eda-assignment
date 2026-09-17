/*
 * File:    ToastContext.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Short pop-up messages ("Station saved") that disappear by themselves.
 * Source:  WEB-06 (React context).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import ToastViewport from '../components/ui/Toast'

const ToastContext = createContext(null)
const SHOW_FOR_MS = 5000
const MAX_TOASTS = 4
let nextId = 1

// Keeps the list of visible toasts.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  // Removes one toast and its timer.
  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts((list) => list.filter((toast) => toast.id !== id))
  }, [])

  // Adds a toast that hides itself after a few seconds.
  const show = useCallback(
    (tone, message) => {
      const id = nextId++
      setToasts((list) => [...list.slice(-(MAX_TOASTS - 1)), { id, tone, message }])
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), SHOW_FOR_MS),
      )
    },
    [dismiss],
  )

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((timer) => clearTimeout(timer))
  }, [])

  const api = useMemo(
    () => ({
      success: (message) => show('success', message),
      error: (message) => show('danger', message),
      info: (message) => show('info', message),
    }),
    [show],
  )

  return (
    <ToastContext value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext>
  )
}

// Returns { success, error, info }.
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>.')
  return context
}
