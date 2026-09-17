/*
 * File:    StatOrb.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Round "breathing" number used on dashboards and the home page.
 * Source:  WEB-01 (stat orbs and clay-breathe animation).
 */
import { Link } from 'react-router'
import { cn } from '../../utils/cn'
import { ORB_COLORS } from './styles'

// Big number in a clay circle with a label underneath. Can link to a page.
export default function StatOrb({ value, label, hint, color = 'violet', loading = false, to, className }) {
  const content = (
    <>
      <span
        className={cn(
          'flex size-28 animate-clay-breathe items-center justify-center rounded-full bg-linear-to-br text-white shadow-clay-button',
          'transition-transform duration-300 group-hover:scale-110 sm:size-32',
          ORB_COLORS[color],
        )}
      >
        <span className="font-heading text-4xl font-black tabular-nums sm:text-5xl">{loading ? '…' : (value ?? '–')}</span>
      </span>
      <span className="font-heading text-sm font-extrabold tracking-wide text-ink uppercase">{label}</span>
      {hint && <span className="max-w-44 text-xs font-medium text-muted">{hint}</span>}
    </>
  )

  const classes = cn('group flex flex-col items-center gap-3 rounded-card p-2 text-center', className)

  if (to) {
    return (
      <Link to={to} className={cn(classes, 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30')}>
        {content}
      </Link>
    )
  }

  return <div className={classes}>{content}</div>
}
