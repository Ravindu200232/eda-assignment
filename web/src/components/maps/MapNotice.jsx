/*
 * File:    MapNotice.jsx
 * Module:  Maps
 * Owner:   Nimthara
 * Purpose: Small note above a map when Google Maps could not be used and the
 *          page switched to OpenStreetMap.
 */
import { Info } from 'lucide-react'

// Shows nothing when there is no note.
export default function MapNotice({ text }) {
  if (!text) return null

  return (
    <p role="status" className="mb-3 flex items-center gap-2 rounded-control bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-900">
      <Info aria-hidden="true" className="size-4 shrink-0 text-info" />
      {text}
    </p>
  )
}
