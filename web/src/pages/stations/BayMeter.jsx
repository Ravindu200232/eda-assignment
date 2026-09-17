/*
 * File:    BayMeter.jsx
 * Module:  Microgrid Stations
 * Owner:   Nimthara
 * Purpose: Small bar that shows how many battery bays are available.
 * Source:  WEB-30 (WAI-ARIA meter pattern).
 */
import { cn } from '../../utils/cn'

// Bar plus "11 of 12 bays". Colour warns when few bays are left.
export default function BayMeter({ available, total, className }) {
  const share = total > 0 ? Math.round((available / total) * 100) : 0
  const tone = share === 0 ? 'bg-pink-500' : share < 34 ? 'bg-amber-400' : 'bg-emerald-400'

  return (
    <div className={cn('min-w-32', className)}>
      <div
        role="meter"
        aria-label="Battery bays available"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={available}
        aria-valuetext={`${available} of ${total} bays available`}
        className="h-3 overflow-hidden rounded-full bg-well shadow-clay-pressed-sm"
      >
        <div className={cn('h-full rounded-full transition-all duration-500', tone)} style={{ width: `${share}%` }} />
      </div>
      <p className="mt-1 text-xs font-bold text-muted">
        {available} of {total} bays
      </p>
    </div>
  )
}
