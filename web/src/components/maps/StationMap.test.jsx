/*
 * File:    StationMap.test.jsx
 * Module:  Maps - unit tests
 * Owner:   Nimthara
 * Purpose: Checks that the page maps pick Google Maps or OpenStreetMap from
 *          the map provider, show the switch-over note, and fall back to
 *          OpenStreetMap when the Google map code breaks.
 */
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PickerMap from './PickerMap'
import StationMap from './StationMap'

const provider = vi.hoisted(() => ({ current: { provider: 'google', notice: null }, googleBroken: false, fallBack: vi.fn() }))

vi.mock('./mapProvider', () => ({ useMapProvider: () => provider.current, fallBackToOpenStreetMap: provider.fallBack }))
vi.mock('./GoogleStationMap', () => ({
  default: ({ label }) => {
    if (provider.googleBroken) throw new TypeError('Google map code failed')
    return <p>Google station map: {label}</p>
  },
}))
vi.mock('./LeafletStationMap', () => ({ default: ({ label }) => <p>OpenStreetMap station map: {label}</p> }))
vi.mock('./GooglePickerMap', () => ({ default: ({ lat }) => <p>Google picker at {lat}</p> }))
vi.mock('./LeafletPickerMap', () => ({ default: ({ lat }) => <p>OpenStreetMap picker at {lat}</p> }))

beforeEach(() => {
  provider.current = { provider: 'google', notice: null }
  provider.googleBroken = false
  provider.fallBack.mockClear()
})

describe('StationMap and PickerMap', () => {
  it('use Google Maps when it is the provider', async () => {
    render(
      <>
        <StationMap stations={[]} label="Stations" />
        <PickerMap lat={6.9} lng={79.9} onPick={vi.fn()} />
      </>,
    )

    expect(await screen.findByText('Google station map: Stations')).toBeInTheDocument()
    expect(await screen.findByText('Google picker at 6.9')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('use OpenStreetMap and explain why after a switch', async () => {
    provider.current = { provider: 'osm', notice: 'Google Maps could not be loaded.' }

    render(
      <>
        <StationMap stations={[]} label="Stations" />
        <PickerMap lat={7.2} lng={79.8} onPick={vi.fn()} />
      </>,
    )

    expect(await screen.findByText('OpenStreetMap station map: Stations')).toBeInTheDocument()
    expect(await screen.findByText('OpenStreetMap picker at 7.2')).toBeInTheDocument()
    expect(screen.getAllByRole('status')).toHaveLength(2)
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Google Maps could not be loaded.')
  })

  it('show OpenStreetMap instead of an error page when the Google map breaks', async () => {
    provider.googleBroken = true
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<StationMap stations={[]} label="Stations" className="xl:col-span-2" />)

    expect(await screen.findByText('OpenStreetMap station map: Stations')).toBeInTheDocument()
    expect(provider.fallBack).toHaveBeenCalledWith('Google Maps stopped working, so OpenStreetMap is shown instead.')
    expect(screen.getByText('OpenStreetMap station map: Stations').parentElement).toHaveClass('xl:col-span-2')
  })
})
