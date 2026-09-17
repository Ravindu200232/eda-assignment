/*
 * File:    StationMap.jsx
 * Module:  Maps
 * Owner:   Nimthara
 * Purpose: The station map used by the pages. It shows Google Maps when a key
 *          is configured and OpenStreetMap otherwise. Only the map code that is
 *          really used is downloaded.
 */
import { Suspense, lazy } from 'react'
import { cn } from '../../utils/cn'
import MapErrorBoundary from './MapErrorBoundary'
import MapNotice from './MapNotice'
import { useMapProvider } from './mapProvider'

const GoogleStationMap = lazy(() => import('./GoogleStationMap'))
const LeafletStationMap = lazy(() => import('./LeafletStationMap'))

// Station map: { stations, selectedId, onSelect, label, className, mapClassName }.
// `className` is for the outer box, so the note and the map stay together in grids.
export default function StationMap({ className, ...props }) {
  const { provider, notice } = useMapProvider()
  const openStreetMap = <LeafletStationMap {...props} />

  return (
    <div className={cn('min-w-0', className)}>
      <MapNotice text={notice} />
      <Suspense fallback={<div aria-hidden="true" className={cn('animate-pulse rounded-tile bg-well', props.mapClassName ?? 'h-[28rem]')} />}>
        {provider === 'google' ? (
          <MapErrorBoundary fallback={openStreetMap}>
            <GoogleStationMap {...props} />
          </MapErrorBoundary>
        ) : (
          openStreetMap
        )}
      </Suspense>
    </div>
  )
}
