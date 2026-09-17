/*
 * File:    LocationPicker.jsx
 * Module:  Maps
 * Owner:   Nimthara
 * Purpose: GPS location field for the station form: a map to click on and
 *          latitude/longitude boxes that stay in step with the pin.
 */
import { LocateFixed } from 'lucide-react'
import Field from '../ui/Field'
import Input from '../ui/Input'
import PickerMap from './PickerMap'

// Turns the typed text into a number, or null when it is not a valid coordinate.
function toCoordinate(text, limit) {
  if (text === '' || text == null) return null
  const value = Number(text)
  return Number.isFinite(value) && Math.abs(value) <= limit ? value : null
}

// Location field. `latitude`/`longitude` are the form's text values;
// `onChange` receives both new values together.
export default function LocationPicker({ latitude, longitude, onChange, errors = {} }) {
  const lat = toCoordinate(latitude, 90)
  const lng = toCoordinate(longitude, 180)
  const pinned = lat != null && lng != null

  return (
    <div className="flex flex-col gap-4">
      <PickerMap
        lat={pinned ? lat : null}
        lng={pinned ? lng : null}
        label="Map for choosing the station location"
        onPick={(point) => onChange({ latitude: point.lat.toFixed(6), longitude: point.lng.toFixed(6) })}
      />
      <p className="flex items-center gap-2 text-sm font-medium text-muted">
        <LocateFixed aria-hidden="true" className="size-4 text-accent" />
        Click the map (or drag the pin) to fill in the coordinates, or type them below.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Latitude" error={errors.latitude} hint="North–south, e.g. 6.9147" required>
          <Input
            name="latitude"
            inputMode="decimal"
            value={latitude}
            onChange={(event) => onChange({ latitude: event.target.value, longitude })}
          />
        </Field>
        <Field label="Longitude" error={errors.longitude} hint="East–west, e.g. 79.9729" required>
          <Input
            name="longitude"
            inputMode="decimal"
            value={longitude}
            onChange={(event) => onChange({ latitude, longitude: event.target.value })}
          />
        </Field>
      </div>
    </div>
  )
}
