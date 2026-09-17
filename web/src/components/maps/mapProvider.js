/*
 * File:    mapProvider.js
 * Module:  Maps
 * Owner:   Nimthara
 * Purpose: Chooses the map service. Google Maps is used when an API key is set
 *          (VITE_GOOGLE_MAPS_API_KEY in web/.env.local). Without a key, or when
 *          Google Maps cannot be used, the pages switch to OpenStreetMap.
 * Source:  WEB-28 (Google Maps JavaScript API).
 */
import { useSyncExternalStore } from 'react'

export const GOOGLE_MAPS_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim()
export const GOOGLE_MAP_ID = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ?? '').trim() || 'DEMO_MAP_ID'

// VITE_MAPS_PROVIDER=osm forces OpenStreetMap (used by the automatic tests).
const forceOpenStreetMap = import.meta.env.VITE_MAPS_PROVIDER === 'osm'

const listeners = new Set()
let state = { provider: GOOGLE_MAPS_KEY && !forceOpenStreetMap ? 'google' : 'osm', notice: null }

// Current { provider, notice } for React.
function getState() {
  return state
}

// Registers a change listener and returns the unsubscribe function.
function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Switches every map to OpenStreetMap and remembers why (only the first time).
export function fallBackToOpenStreetMap(reason) {
  if (state.provider === 'osm') return
  state = { provider: 'osm', notice: reason }
  listeners.forEach((listener) => listener())
}

// Returns { provider: 'google' | 'osm', notice }.
export function useMapProvider() {
  return useSyncExternalStore(subscribe, getState)
}
