/*
 * File:    useDebouncedValue.js
 * Module:  Core hooks
 * Owner:   Ravindu
 * Purpose: Waits until the user stops typing before a search is sent to the API.
 */
import { useEffect, useState } from 'react'

// Returns `value` once it has not changed for `delay` milliseconds.
export function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
