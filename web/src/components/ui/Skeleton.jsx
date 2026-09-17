/*
 * File:    Skeleton.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Soft placeholder blocks shown while data is loading.
 */
import { cn } from '../../utils/cn'

// One pulsing placeholder block.
export default function Skeleton({ className }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-control bg-white/70 shadow-clay-pressed-sm', className)} />
}

// A few placeholder rows for tables and lists.
export function SkeletonRows({ rows = 4, label = 'Loading…' }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-16" />
      ))}
    </div>
  )
}
