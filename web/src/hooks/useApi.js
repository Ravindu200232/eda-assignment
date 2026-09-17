/*
 * File:    useApi.js
 * Module:  Core hooks
 * Owner:   Ravindu
 * Purpose: Loads data from the API and keeps loading, error and data state,
 *          so pages do not repeat the same useEffect code.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { getErrorMessage } from '../api/client'

// Calls `request` now and whenever `deps` change. Older answers are ignored
// if a newer request was started in the meantime.
export function useApi(request, deps = []) {
  const [state, setState] = useState({ data: undefined, error: null, loading: true })
  const latestCall = useRef(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps -- callers list what the request depends on
  const load = useCallback(request, deps)

  // Runs the request again, e.g. after a change or when the user presses "Try again".
  const reload = useCallback(async () => {
    const call = ++latestCall.current
    setState((previous) => ({ ...previous, error: null, loading: true }))
    try {
      const data = await load()
      if (call === latestCall.current) setState({ data, error: null, loading: false })
    } catch (error) {
      if (call === latestCall.current) setState((previous) => ({ ...previous, error: getErrorMessage(error), loading: false }))
    }
  }, [load])

  useEffect(() => {
    reload()
    return () => {
      latestCall.current += 1
    }
  }, [reload])

  // Lets a page update the shown data after a change without reloading.
  const setData = useCallback((update) => {
    setState((previous) => ({
      ...previous,
      data: typeof update === 'function' ? update(previous.data) : update,
    }))
  }, [])

  return { ...state, reload, setData }
}
