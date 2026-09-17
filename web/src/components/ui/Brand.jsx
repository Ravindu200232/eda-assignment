/*
 * File:    Brand.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Portal logo and name, linked to the start page.
 */
import { Sun } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '../../utils/cn'

// Logo tile with the product name. `compact` hides the second line.
export default function Brand({ to = '/', compact = false, className }) {
  return (
    <Link
      to={to}
      className={cn(
        'group inline-flex items-center gap-3 rounded-control focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30',
        className,
      )}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-amber-300 to-amber-500 text-white shadow-clay-button transition-transform duration-300 group-hover:rotate-12">
        <Sun aria-hidden="true" className="size-6" />
      </span>
      <span className="leading-tight">
        <span className="block font-heading text-lg font-black tracking-tight text-ink">SolarGrid</span>
        {!compact && <span className="block text-xs font-bold text-muted">Smart Microgrid Portal</span>}
      </span>
    </Link>
  )
}
