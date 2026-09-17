/*
 * File:    Spinner.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Small loading ring, plus a full-area loader for pages that are still loading.
 */
import { cn } from '../../utils/cn'

const SIZES = {
  sm: 'size-4 border-2',
  md: 'size-6 border-[3px]',
  lg: 'size-10 border-4',
}

// Spinning ring. Without a label it is hidden from screen readers.
export default function Spinner({ size = 'md', label, className }) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('inline-block shrink-0 animate-spin rounded-full border-current border-r-transparent', SIZES[size], className)}
    />
  )
}

// Centred loader used while a page or its data loads.
export function PageLoader({ label = 'Loading…', fullScreen = false }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 text-accent',
        fullScreen ? 'min-h-dvh bg-canvas' : 'min-h-[40vh]',
      )}
    >
      <Spinner size="lg" label={label} />
      <p aria-hidden="true" className="font-heading font-bold text-muted">
        {label}
      </p>
    </div>
  )
}
