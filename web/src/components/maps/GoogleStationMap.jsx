/*
 * File:    GoogleStationMap.jsx
 * Module:  Maps
 * Owner:   Nimthara
 * Purpose: Google Maps version of the station map: a coloured pin for every
 *          station; clicking a pin selects the station.
 * Source:  WEB-28 (Google Maps advanced markers and gmp-click, LatLngBounds, fitBounds).
 */
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import Spinner from '../ui/Spinner'
import { cn } from '../../utils/cn'
import { createGoogleMap, loadGoogleMaps, pinElement, removeMarker } from './googleMaps'

// Station map. Same props as the OpenStreetMap version.
export default function GoogleStationMap({ stations, selectedId, onSelect, label = 'Map of stations', className, mapClassName = 'h-[28rem]' }) {
  const hostRef = useRef(null)
  const mapRef = useRef(null)
  const pinsRef = useRef([])
  const [google, setGoogle] = useState(null)
  const select = useEffectEvent((station) => onSelect?.(station))

  // Loads Google Maps and creates the map once.
  useEffect(() => {
    let active = true
    loadGoogleMaps()
      .then((libraries) => {
        if (!active) return
        mapRef.current = createGoogleMap(libraries, hostRef.current)
        setGoogle(libraries)
      })
      .catch(() => {
        // mapProvider switches the page to OpenStreetMap.
      })
    return () => {
      active = false
      pinsRef.current.forEach(removeMarker)
      pinsRef.current = []
    }
  }, [])

  // Draws one pin per station; the selected one is pink.
  useEffect(() => {
    if (!google) return
    pinsRef.current.forEach(removeMarker)
    pinsRef.current = stations.map((station) => {
      const tone = station.id === selectedId ? 'selected' : station.status === 'Active' ? 'active' : 'inactive'
      const pin = new google.AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: station.latitude, lng: station.longitude },
        title: station.name,
        content: pinElement(google, tone),
        zIndex: tone === 'selected' ? 1000 : 0,
        gmpClickable: true,
      })
      pin.addEventListener('gmp-click', () => select(station))
      return pin
    })
  }, [google, stations, selectedId])

  // Shows every station when the list changes.
  useEffect(() => {
    if (!google || stations.length === 0) return
    const map = mapRef.current
    if (stations.length === 1) {
      map.setCenter({ lat: stations[0].latitude, lng: stations[0].longitude })
      map.setZoom(13)
      return
    }
    const bounds = new google.LatLngBounds()
    stations.forEach((station) => bounds.extend({ lat: station.latitude, lng: station.longitude }))
    map.fitBounds(bounds, 48)
  }, [google, stations])

  return (
    <div className={cn('relative overflow-hidden rounded-tile shadow-clay-pressed', className)}>
      <div ref={hostRef} role="region" aria-label={label} className={cn('w-full', mapClassName)} />
      {!google && (
        <div className="absolute inset-0 flex items-center justify-center bg-well/80 text-accent">
          <Spinner size="lg" label="Loading Google Maps…" />
        </div>
      )}
    </div>
  )
}
