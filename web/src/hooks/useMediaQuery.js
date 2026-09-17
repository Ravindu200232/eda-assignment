/*
 * File:    useMediaQuery.js
 * Module:  Core hooks
 * Owner:   Ravindu
 * Purpose: Tells a component whether a CSS media query matches, and updates
 *          when the window is resized.
 */
import { useCallback, useSyncExternalStore } from 'react'

// Returns true while the media query matches.
export function useMediaQuery(query) {
  // Tells React when the query result changes.
  const subscribe = useCallback(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )

  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}
