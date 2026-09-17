/*
 * File:    mapProvider.test.jsx
 * Module:  Maps - unit tests
 * Owner:   Nimthara
 * Purpose: Checks how the map service is chosen: Google Maps with a key,
 *          OpenStreetMap without one, and the switch to OpenStreetMap when
 *          Google Maps fails (bad key or no connection).
 */
import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const loader = vi.hoisted(() => ({ setOptions: vi.fn(), importLibrary: vi.fn() }))
vi.mock('@googlemaps/js-api-loader', () => loader)

// Loads fresh copies of the map modules with the given settings.
async function loadWith({ key = '', provider = '' } = {}) {
  vi.resetModules()
  vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', key)
  vi.stubEnv('VITE_MAPS_PROVIDER', provider)
  const providerModule = await import('./mapProvider')
  const googleModule = await import('./googleMaps')
  return { ...providerModule, ...googleModule }
}

// Prints the chosen provider and notice.
function Probe({ useMapProvider }) {
  const { provider, notice } = useMapProvider()
  return (
    <p>
      {provider} | {notice ?? 'no notice'}
    </p>
  )
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
  delete window.gm_authFailure
})

describe('map provider', () => {
  it('uses Google Maps only when a key is set and not switched off', async () => {
    const withKey = await loadWith({ key: 'test-key' })
    render(<Probe useMapProvider={withKey.useMapProvider} />)
    expect(screen.getByText('google | no notice')).toBeInTheDocument()

    const withoutKey = await loadWith()
    render(<Probe useMapProvider={withoutKey.useMapProvider} />)
    expect(screen.getByText('osm | no notice')).toBeInTheDocument()

    const forced = await loadWith({ key: 'test-key', provider: 'osm' })
    render(<Probe useMapProvider={forced.useMapProvider} />)
    expect(screen.getAllByText('osm | no notice')).toHaveLength(2)
  })

  it('loads Google Maps once with the key', async () => {
    loader.importLibrary.mockImplementation(async (name) => ({ core: { LatLngBounds: 'B' }, maps: { Map: 'M' }, marker: { AdvancedMarkerElement: 'A', PinElement: 'P' } })[name])
    const maps = await loadWith({ key: 'test-key' })

    const [first, second] = await Promise.all([maps.loadGoogleMaps(), maps.loadGoogleMaps()])

    expect(first).toEqual({ LatLngBounds: 'B', Map: 'M', AdvancedMarkerElement: 'A', PinElement: 'P' })
    expect(second).toBe(first)
    expect(loader.setOptions).toHaveBeenCalledTimes(1)
    expect(loader.setOptions).toHaveBeenCalledWith(expect.objectContaining({ key: 'test-key', region: 'LK' }))
  })

  it('switches to OpenStreetMap when Google refuses the key', async () => {
    loader.importLibrary.mockImplementation(async () => ({}))
    const maps = await loadWith({ key: 'test-key' })
    render(<Probe useMapProvider={maps.useMapProvider} />)

    await maps.loadGoogleMaps()
    act(() => window.gm_authFailure())

    expect(screen.getByText('osm | Google Maps did not accept the API key, so OpenStreetMap is shown instead.')).toBeInTheDocument()
  })

  it('switches to OpenStreetMap when the script cannot be downloaded', async () => {
    loader.importLibrary.mockRejectedValue(new Error('offline'))
    const maps = await loadWith({ key: 'test-key' })
    render(<Probe useMapProvider={maps.useMapProvider} />)

    await act(async () => {
      await expect(maps.loadGoogleMaps()).rejects.toThrow('offline')
    })

    expect(screen.getByText(/^osm \| Google Maps could not be loaded/)).toBeInTheDocument()
  })
})
