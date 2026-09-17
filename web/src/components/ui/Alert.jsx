/*
 * File:    Alert.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Inline message box for errors, warnings, tips and success notes.
 */
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { cn } from '../../utils/cn'

const TONES = {
  info: { icon: Info, classes: 'bg-sky-50 text-sky-900 ring-sky-200', iconClass: 'text-info' },
  success: { icon: CircleCheck, classes: 'bg-emerald-50 text-emerald-900 ring-emerald-200', iconClass: 'text-success' },
  warning: { icon: TriangleAlert, classes: 'bg-amber-50 text-amber-900 ring-amber-200', iconClass: 'text-warning' },
  danger: { icon: CircleAlert, classes: 'bg-pink-50 text-pink-900 ring-pink-200', iconClass: 'text-danger' },
}

// Message box. Errors are announced to screen readers straight away.
export default function Alert({ tone = 'info', title, action, className, children }) {
  const { icon: Icon, classes, iconClass } = TONES[tone]

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-tile px-5 py-4 ring-1 ring-inset', classes, className)}
    >
      <Icon aria-hidden="true" className={cn('mt-0.5 size-5 shrink-0', iconClass)} />
      <div className="min-w-0 flex-1 text-sm leading-relaxed font-medium">
        {title && <p className="font-heading text-base font-extrabold">{title}</p>}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
