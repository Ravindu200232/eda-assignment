/*
 * File:    Toast.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Draws the toast messages in a corner of the screen.
 */
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { cn } from '../../utils/cn'
import IconButton from './IconButton'

const TONES = {
  success: { icon: CircleCheck, orb: 'from-emerald-400 to-emerald-600' },
  danger: { icon: CircleAlert, orb: 'from-pink-400 to-pink-600' },
  info: { icon: Info, orb: 'from-sky-400 to-sky-600' },
}

// Stack of toasts. Screen readers announce new ones.
export default function ToastViewport({ toasts, onDismiss }) {
  return (
    <div
      aria-live="polite"
      className="no-print pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-3 sm:inset-x-auto sm:right-6 sm:bottom-6"
    >
      {toasts.map((toast) => {
        const { icon: Icon, orb } = TONES[toast.tone] ?? TONES.info
        return (
          <div
            key={toast.id}
            role={toast.tone === 'danger' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full animate-clay-pop items-center gap-3 rounded-tile bg-white/90 py-3 pr-2 pl-3 shadow-clay-card backdrop-blur-xl sm:w-96"
          >
            <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br text-white', orb)}>
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <p className="min-w-0 flex-1 text-sm leading-snug font-semibold text-ink">{toast.message}</p>
            <IconButton icon={X} label="Dismiss message" onClick={() => onDismiss(toast.id)} />
          </div>
        )
      })}
    </div>
  )
}
