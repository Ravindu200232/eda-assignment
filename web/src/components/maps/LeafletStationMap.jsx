/*
 * File:    LeafletStationMap.jsx
 * Module:  Maps
 * Owner:   Nimthara
 * Purpose: OpenStreetMap version of the station map (used without a Google
 *          Maps key): a pin for every station; clicking a pin selects it.
 * Source:  WEB-15 (Leaflet markers, layer groups and fitBounds).
 */
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { MapPinOff } from 'lucide-react'
import { cn } from '../../utils/cn'
import { L, createMap, markerIcon, textLabel } from './leafletSetup'

// Station map. `stations` need id, name, code, status, latitude and longitude.
export default function LeafletStationMap({ stations, selectedId, onSelect, label = 'Map of stations', className, mapClassName = 'h-[28rem]' }) {
  const hostRef = useRef(null)
  const mapRef = useRef(null)
  const pinsRef = useRef(null)
  const [tilesFailed, setTilesFailed] = useState(false)
  const select = useEffectEvent((station) => onSelect?.(station))

  // Creates the map once and removes it when the page closes.
  useEffect(() => {
    const map = createMap(hostRef.current, { onTilesFailed: () => setTilesFailed(true) })
    pinsRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Draws one pin per station; the selected one is pink.
  useEffect(() => {
    const pins = pinsRef.current
    pins.clearLayers()
    for (const station of stations) {
      const tone = station.id === selectedId ? 'selected' : station.status === 'Active' ? 'active' : 'inactive'
      const pin = L.marker([station.latitude, station.longitude], {
        icon: markerIcon(tone),
        title: station.name,
        alt: station.name,
        keyboard: true,
        zIndexOffset: tone === 'selected' ? 1000 : 0,
      })
      pin.bindTooltip(textLabel(`${station.name} (${station.code})`))
      pin.on('click', () => select(station))
      pin.addTo(pins)
    }
  }, [stations, selectedId])

  // Zooms to show every station when the list changes.
  useEffect(() => {
    if (stations.length === 0) return
    const points = stations.map((station) => [station.latitude, station.longitude])
    mapRef.current.fitBounds(points, { padding: [48, 48], maxZoom: 12 })
  }, [stations])

  return (
    <div className={cn('relative overflow-hidden rounded-tile shadow-clay-pressed', className)}>
      <div ref={hostRef} role="region" aria-label={label} className={cn("w-full", mapClassName)} />
      {tilesFailed && (
        <p className="absolute inset-x-3 bottom-3 z-[1000] flex items-center gap-2 rounded-control bg-white/95 px-4 py-2 text-sm font-semibold text-ink shadow-clay-card">
          <MapPinOff aria-hidden="true" className="size-4 shrink-0 text-accent-alt" />
          Map pictures could not be loaded (no internet?). The pins and the station list still work.
        </p>
      )}
    </div>
  )
}
