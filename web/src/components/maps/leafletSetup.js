/*
 * File:    leafletSetup.js
 * Module:  Maps
 * Owner:   Nimthara
 * Purpose: Shared Leaflet settings for the OpenStreetMap maps: the layer with its required
 *          credit line, the starting view over Sri Lanka and the round clay
 *          markers used for stations.
 * Source:  WEB-15 (Leaflet), WEB-16 (OpenStreetMap tile use and attribution).
 */
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export const SRI_LANKA_VIEW = { center: [7.8731, 80.7718], zoom: 7 }

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_CREDIT = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const MARKER_TONES = {
  active: 'from-violet-400 to-violet-600',
  inactive: 'from-slate-400 to-slate-500',
  selected: 'from-pink-400 to-pink-600',
}

// Creates a map inside `element` with the OpenStreetMap layer.
// `onTilesFailed` runs once when map pictures cannot be downloaded.
export function createMap(element, { center = SRI_LANKA_VIEW.center, zoom = SRI_LANKA_VIEW.zoom, onTilesFailed } = {}) {
  const map = L.map(element, { center, zoom, scrollWheelZoom: false })
  map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>')
  const tiles = L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_CREDIT })
  if (onTilesFailed) tiles.once('tileerror', onTilesFailed)
  tiles.addTo(map)
  return map
}

// Round clay pin. The HTML never contains user text.
export function markerIcon(tone = 'active') {
  return L.divIcon({
    className: 'clay-marker',
    html: `<span class="block size-9 rounded-full rounded-br-none rotate-45 border-4 border-white bg-linear-to-br shadow-clay-button ${MARKER_TONES[tone]}"></span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  })
}

// Wraps text in an element so Leaflet shows it as plain text, not HTML.
export function textLabel(text) {
  const label = document.createElement('span')
  label.textContent = text
  return label
}

export { L }
