/*
 * File:    LeafletPickerMap.jsx
 * Module:  Maps
 * Owner:   Nimthara
 * Purpose: OpenStreetMap version of the location chooser (used without a
 *          Google Maps key). Clicking the map moves the pin; it can be dragged.
 * Source:  WEB-15 (Leaflet map click and draggable marker events).
 */
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { MapPinOff } from 'lucide-react'
import { L, createMap, markerIcon } from './leafletSetup'

const PICKED_ZOOM = 14

// Location map. `lat`/`lng` are numbers or null; `onPick` receives { lat, lng }.
export default function LeafletPickerMap({ lat, lng, onPick, label = 'Map for choosing the location' }) {
  const hostRef = useRef(null)
  const mapRef = useRef(null)
  const pinRef = useRef(null)
  const startRef = useRef(lat != null && lng != null ? { center: [lat, lng], zoom: PICKED_ZOOM } : {})
  const [tilesFailed, setTilesFailed] = useState(false)
  const pick = useEffectEvent((point) => onPick({ lat: point.lat, lng: point.lng }))

  // Creates the map once; a click anywhere picks that point.
  useEffect(() => {
    const map = createMap(hostRef.current, { ...startRef.current, onTilesFailed: () => setTilesFailed(true) })
    map.on('click', (event) => pick(event.latlng))
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      pinRef.current = null
    }
  }, [])

  // Keeps the pin where the typed or picked coordinates are.
  useEffect(() => {
    const map = mapRef.current
    if (lat == null || lng == null) {
      pinRef.current?.remove()
      pinRef.current = null
      return
    }

    if (!pinRef.current) {
      pinRef.current = L.marker([lat, lng], { icon: markerIcon('selected'), draggable: true, keyboard: true, title: 'Chosen location' })
      pinRef.current.on('dragend', (event) => pick(event.target.getLatLng()))
      pinRef.current.addTo(map)
    } else {
      pinRef.current.setLatLng([lat, lng])
    }

    if (!map.getBounds().contains([lat, lng])) map.panTo([lat, lng])
  }, [lat, lng])

  return (
    <div className="relative overflow-hidden rounded-tile shadow-clay-pressed">
      <div ref={hostRef} role="region" aria-label={label} className="h-80 w-full cursor-crosshair" />
      {tilesFailed && (
        <p className="absolute inset-x-3 bottom-3 z-[1000] flex items-center gap-2 rounded-control bg-white/95 px-4 py-2 text-sm font-semibold text-ink shadow-clay-card">
          <MapPinOff aria-hidden="true" className="size-4 shrink-0 text-accent-alt" />
          Map pictures could not be loaded. You can still click the map or type the coordinates.
        </p>
      )}
    </div>
  )
}
