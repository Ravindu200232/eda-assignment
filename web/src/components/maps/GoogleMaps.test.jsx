/*
 * File:    GoogleMaps.test.jsx
 * Module:  Maps - unit tests
 * Owner:   Nimthara
 * Purpose: Checks the Google Maps station map and location chooser with a fake
 *          Google library: pins, colours, selection, clicks and dragging.
 */
import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeGoogle, latLng } from '../../test/fakeGoogleMaps'
import GooglePickerMap from './GooglePickerMap'
import GoogleStationMap from './GoogleStationMap'
import { removeMarker } from './googleMaps'

const fake = vi.hoisted(() => ({ google: null }))

vi.mock('./googleMaps', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, loadGoogleMaps: () => Promise.resolve(fake.google.libraries) }
})

const stations = [
  { id: 'a', code: 'SSG-MAL-01', name: 'SLIIT Malabe Campus Microgrid', status: 'Active', latitude: 6.9147, longitude: 79.9729 },
  { id: 'b', code: 'SSG-NEG-01', name: 'Negombo Beach Solar Station', status: 'Inactive', latitude: 7.2167, longitude: 79.8378 },
]

beforeEach(() => {
  fake.google = createFakeGoogle()
})

describe('GoogleStationMap', () => {
  it('shows a coloured pin for every station and zooms to them', async () => {
    render(<GoogleStationMap stations={stations} selectedId="b" />)

    await waitFor(() => expect(fake.google.visibleMarkers()).toHaveLength(2))
    const [malabe, negombo] = fake.google.visibleMarkers()
    expect(malabe).toMatchObject({ title: 'SLIIT Malabe Campus Microgrid', position: { lat: 6.9147, lng: 79.9729 } })
    expect(malabe.content.dataset.colour).toBe('#7c3aed')
    expect(negombo.content.dataset.colour).toBe('#db2777')
    expect(fake.google.maps[0].options).toMatchObject({ mapId: 'DEMO_MAP_ID', gestureHandling: 'cooperative' })
    expect(fake.google.maps[0].bounds.points).toHaveLength(2)
    expect(screen.queryByRole('status', { name: 'Loading Google Maps…' })).not.toBeInTheDocument()
  })

  it('reports the station whose pin was clicked', async () => {
    const onSelect = vi.fn()
    render(<GoogleStationMap stations={stations} onSelect={onSelect} />)
    await waitFor(() => expect(fake.google.visibleMarkers()).toHaveLength(2))

    act(() => fake.google.visibleMarkers()[0].listeners['gmp-click']())

    expect(onSelect).toHaveBeenCalledWith(stations[0])
  })

  it('centres on a single station', async () => {
    render(<GoogleStationMap stations={[stations[0]]} />)

    await waitFor(() => expect(fake.google.maps[0].zoom).toBe(13))
    expect(fake.google.maps[0].center).toEqual({ lat: 6.9147, lng: 79.9729 })
  })
})

describe('GooglePickerMap', () => {
  it('picks the clicked point and the dragged pin position', async () => {
    const onPick = vi.fn()
    const { rerender } = render(<GooglePickerMap lat={null} lng={null} onPick={onPick} />)
    await waitFor(() => expect(fake.google.maps).toHaveLength(1))
    const map = fake.google.maps[0]

    act(() => map.listeners.click({ latLng: latLng(6.9, 79.95) }))
    expect(onPick).toHaveBeenLastCalledWith({ lat: 6.9, lng: 79.95 })

    rerender(<GooglePickerMap lat={6.9} lng={79.95} onPick={onPick} />)
    const [pin] = fake.google.visibleMarkers()
    expect(pin).toMatchObject({ position: { lat: 6.9, lng: 79.95 }, gmpDraggable: true })

    pin.position = latLng(6.91, 79.96)
    act(() => pin.listeners['gmp-dragend']())
    expect(onPick).toHaveBeenLastCalledWith({ lat: 6.91, lng: 79.96 })
  })

  it('moves the pin when coordinates are typed and removes it when cleared', async () => {
    const { rerender } = render(<GooglePickerMap lat={7.29} lng={80.64} onPick={vi.fn()} />)
    await waitFor(() => expect(fake.google.visibleMarkers()).toHaveLength(1))
    expect(fake.google.maps[0].options.center).toEqual({ lat: 7.29, lng: 80.64 })

    rerender(<GooglePickerMap lat={7.3} lng={80.65} onPick={vi.fn()} />)
    expect(fake.google.visibleMarkers()[0].position).toEqual({ lat: 7.3, lng: 80.65 })

    rerender(<GooglePickerMap lat={null} lng={null} onPick={vi.fn()} />)
    expect(fake.google.visibleMarkers()).toHaveLength(0)
  })
})

describe('removeMarker', () => {
  it('ignores errors from a map that Google left half built', () => {
    const marker = {}
    Object.defineProperty(marker, 'map', {
      set() {
        throw new TypeError("Cannot read properties of undefined (reading 'getRootNode')")
      },
    })

    expect(() => removeMarker(marker)).not.toThrow()
  })
})
