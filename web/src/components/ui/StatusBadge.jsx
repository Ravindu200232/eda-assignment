/*
 * File:    StatusBadge.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Coloured pill for statuses, roles and trade types, so every page
 *          shows the same word in the same colour.
 */
import { cn } from '../../utils/cn'
import { formatLabel } from '../../utils/format'

const TONES = {
  success: 'bg-emerald-100 text-emerald-800 before:bg-emerald-500',
  warning: 'bg-amber-100 text-amber-800 before:bg-amber-500',
  danger: 'bg-pink-100 text-pink-800 before:bg-pink-500',
  info: 'bg-sky-100 text-sky-800 before:bg-sky-500',
  accent: 'bg-violet-100 text-violet-800 before:bg-violet-500',
  neutral: 'bg-well text-muted before:bg-muted',
}

const STATUS_TONES = {
  Active: 'success',
  Approved: 'success',
  Completed: 'success',
  Pending: 'warning',
  Deactivated: 'danger',
  Rejected: 'danger',
  Missed: 'danger',
  Cancelled: 'neutral',
  Inactive: 'neutral',
  Export: 'info',
  Import: 'accent',
  Backoffice: 'accent',
  GridOperator: 'info',
  Prosumer: 'success',
}

// Pill with a dot. `status` picks the colour unless `tone` is given.
export default function StatusBadge({ status, label, tone, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 font-heading text-xs font-extrabold tracking-wide',
        'before:size-1.5 before:rounded-full',
        TONES[tone ?? STATUS_TONES[status] ?? 'neutral'],
        className,
      )}
    >
      {label ?? formatLabel(status)}
    </span>
  )
}
