/*
 * File:    LeafletStationMap.test.jsx
 * Module:  Maps - unit tests
 * Owner:   Nimthara
 * Purpose: Checks the OpenStreetMap station map with the real Leaflet library: one pin per
 *          station, selection by click, and station names shown as plain text.
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import StationMap from './LeafletStationMap'

const stations = [
  { id: 'a', code: 'SSG-MAL-01', name: 'SLIIT Malabe Campus Microgrid', status: 'Active', latitude: 6.9147, longitude: 79.9729 },
  { id: 'b', code: 'SSG-NEG-01', name: '<img src=x onerror=alert(1)>', status: 'Inactive', latitude: 7.2167, longitude: 79.8378 },
]

describe('StationMap', () => {
  it('draws a pin for every station and reports clicks', () => {
    const onSelect = vi.fn()
    const { container } = render(<StationMap stations={stations} onSelect={onSelect} />)

    expect(screen.getByRole('region', { name: 'Map of stations' })).toBeInTheDocument()
    const pins = container.querySelectorAll('.clay-marker')
    expect(pins).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'SLIIT Malabe Campus Microgrid' }))
    expect(onSelect).toHaveBeenCalledWith(stations[0])
  })

  it('never turns station names into HTML', () => {
    const { container } = render(<StationMap stations={stations} />)

    expect(container.querySelector('img[src="x"]')).toBeNull()
    expect(screen.getByRole('button', { name: '<img src=x onerror=alert(1)>' })).toBeInTheDocument()
  })

  it('credits OpenStreetMap', () => {
    render(<StationMap stations={stations} />)
    expect(screen.getByRole('link', { name: 'OpenStreetMap' })).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright')
  })
})
