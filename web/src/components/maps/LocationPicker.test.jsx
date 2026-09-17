/*
 * File:    LocationPicker.test.jsx
 * Module:  Maps - unit tests
 * Owner:   Nimthara
 * Purpose: Checks that the map pick and the latitude/longitude boxes stay in step.
 */
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import LocationPicker from './LocationPicker'

const map = vi.hoisted(() => ({ props: null }))

vi.mock('./PickerMap', () => ({
  default: (props) => {
    map.props = props
    return (
      <button type="button" onClick={() => props.onPick({ lat: 6.914712345, lng: 79.972934567 })}>
        Pretend map click
      </button>
    )
  },
}))

// Picker with its own form state.
function Harness({ initial = { latitude: '', longitude: '' } }) {
  const [point, setPoint] = useState(initial)
  return <LocationPicker latitude={point.latitude} longitude={point.longitude} onChange={setPoint} />
}

describe('LocationPicker', () => {
  it('fills the boxes when the map is clicked', async () => {
    render(<Harness />)
    expect(map.props.lat).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Pretend map click' }))

    expect(screen.getByLabelText(/^Latitude/)).toHaveValue('6.914712')
    expect(screen.getByLabelText(/^Longitude/)).toHaveValue('79.972935')
    expect(map.props).toMatchObject({ lat: 6.914712, lng: 79.972935 })
  })

  it('moves the pin when coordinates are typed', async () => {
    render(<Harness />)

    await userEvent.type(screen.getByLabelText(/^Latitude/), '7.2926')
    expect(map.props.lat).toBeNull()
    await userEvent.type(screen.getByLabelText(/^Longitude/), '80.6413')

    expect(map.props).toMatchObject({ lat: 7.2926, lng: 80.6413 })
  })

  it('ignores coordinates outside the world', async () => {
    render(<Harness initial={{ latitude: '95', longitude: '80' }} />)
    expect(map.props.lat).toBeNull()
    expect(map.props.lng).toBeNull()
  })
})
