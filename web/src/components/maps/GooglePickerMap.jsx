/*
 * File:    GooglePickerMap.jsx
 * Module:  Maps
 * Owner:   Nimthara
 * Purpose: Google Maps version of the location chooser. Clicking the map
 *          moves the pin there, and the pin can also be dragged.
 * Source:  WEB-28 (Google Maps click events, draggable advanced markers and gmp-dragend).
 */
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import Spinner from '../ui/Spinner'
import { createGoogleMap, loadGoogleMaps, pinElement, removeMarker, toPoint } from './googleMaps'

const PICKED_ZOOM = 15

// Location map. Same props as the OpenStreetMap version.
export default function GooglePickerMap({ lat, lng, onPick, label = 'Map for choosing the location' }) {
  const hostRef = useRef(null)
  const mapRef = useRef(null)
  const pinRef = useRef(null)
  const startRef = useRef(lat != null && lng != null ? { center: { lat, lng }, zoom: PICKED_ZOOM } : {})
  const [google, setGoogle] = useState(null)
  const pick = useEffectEvent((point) => {
    if (point) onPick(point)
  })

  // Loads Google Maps and creates the map once; a click picks that point.
  useEffect(() => {
    let active = true
    loadGoogleMaps()
      .then((libraries) => {
        if (!active) return
        const map = createGoogleMap(libraries, hostRef.current, startRef.current)
        map.addListener('click', (event) => pick(toPoint(event.latLng)))
        mapRef.current = map
        setGoogle(libraries)
      })
      .catch(() => {
        // mapProvider switches the page to OpenStreetMap.
      })
    return () => {
      active = false
      if (pinRef.current) removeMarker(pinRef.current)
      pinRef.current = null
    }
  }, [])

  // Keeps the pin where the typed or picked coordinates are.
  useEffect(() => {
    if (!google) return
    const map = mapRef.current
    if (lat == null || lng == null) {
      if (pinRef.current) removeMarker(pinRef.current)
      pinRef.current = null
      return
    }

    const position = { lat, lng }
    if (!pinRef.current) {
      const pin = new google.AdvancedMarkerElement({
        map,
        position,
        title: 'Chosen location',
        content: pinElement(google, 'selected'),
        gmpDraggable: true,
      })
      pin.addEventListener('gmp-dragend', () => pick(toPoint(pin.position)))
      pinRef.current = pin
    } else {
      pinRef.current.position = position
    }

    if (!map.getBounds()?.contains(position)) map.panTo(position)
  }, [google, lat, lng])

  return (
    <div className="relative overflow-hidden rounded-tile shadow-clay-pressed">
      <div ref={hostRef} role="region" aria-label={label} className="h-80 w-full" />
      {!google && (
        <div className="absolute inset-0 flex items-center justify-center bg-well/80 text-accent">
          <Spinner size="lg" label="Loading Google Maps…" />
        </div>
      )}
    </div>
  )
}
