/*
 * File:    EmptyState.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Friendly message shown when a list has nothing to show.
 */
import { SearchX } from 'lucide-react'
import IconOrb from './IconOrb'

// Centred icon, title, text and an optional action button.
export default function EmptyState({ icon = SearchX, color = 'sky', title, message, action }) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
      <IconOrb icon={icon} color={color} size="lg" className="animate-clay-float" />
      <h3 className="font-heading text-xl font-extrabold text-ink">{title}</h3>
      {message && <p className="max-w-md leading-relaxed font-medium text-muted">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
