/*
 * File:    googleMaps.js
 * Module:  Maps
 * Owner:   Nimthara
 * Purpose: Loads the Google Maps JavaScript API once and offers small helpers
 *          for the portal's maps: the start view, coloured station pins and
 *          reading coordinates. Failures switch the pages to OpenStreetMap.
 * Source:  WEB-28 (Google Maps JavaScript API: loader, advanced markers,
 *          authentication errors).
 */
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import { GOOGLE_MAPS_KEY, GOOGLE_MAP_ID, fallBackToOpenStreetMap } from './mapProvider'

export const SRI_LANKA_CENTER = { lat: 7.8731, lng: 80.7718 }
export const SRI_LANKA_ZOOM = 7

const PIN_COLOURS = {
  active: '#7c3aed',
  inactive: '#64748b',
  selected: '#db2777',
}

let loading = null

// Loads the libraries the portal uses. Later calls reuse the first download.
export function loadGoogleMaps() {
  if (!loading) {
    // Google calls this global function when it refuses the key (for example a wrong website restriction).
    window.gm_authFailure = () =>
      fallBackToOpenStreetMap('Google Maps did not accept the API key, so OpenStreetMap is shown instead.')

    setOptions({ key: GOOGLE_MAPS_KEY, v: 'weekly', language: 'en', region: 'LK' })
    loading = Promise.all([importLibrary('core'), importLibrary('maps'), importLibrary('marker')])
      .then(([core, maps, marker]) => ({
        LatLngBounds: core.LatLngBounds,
        Map: maps.Map,
        AdvancedMarkerElement: marker.AdvancedMarkerElement,
        PinElement: marker.PinElement,
      }))
      .catch((error) => {
        fallBackToOpenStreetMap('Google Maps could not be loaded (no internet?), so OpenStreetMap is shown instead.')
        throw error
      })
  }
  return loading
}

// A Google map with the portal's settings.
export function createGoogleMap(google, element, { center = SRI_LANKA_CENTER, zoom = SRI_LANKA_ZOOM } = {}) {
  return new google.Map(element, {
    center,
    zoom,
    mapId: GOOGLE_MAP_ID,
    clickableIcons: false,
    gestureHandling: 'cooperative',
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  })
}

// Coloured pin for a marker ("active", "inactive" or "selected"). The PinElement is itself the marker content.
export function pinElement(google, tone) {
  return new google.PinElement({ background: PIN_COLOURS[tone], borderColor: '#ffffff', glyphColor: '#ffffff' })
}

// Takes a marker off its map. After Google refuses the key its map is half built and
// this can throw; the page is switching to OpenStreetMap then, so the error is ignored.
export function removeMarker(marker) {
  try {
    marker.map = null
  } catch {
    // Nothing to clean up on a broken map.
  }
}

// Reads { lat, lng } from a Google LatLng object or a plain literal.
export function toPoint(position) {
  if (!position) return null
  return typeof position.lat === 'function' ? { lat: position.lat(), lng: position.lng() } : { lat: position.lat, lng: position.lng }
}
