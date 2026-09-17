/*
 * File:    BatteryBaysControl.jsx
 * Module:  Microgrid Stations
 * Owner:   Nimthara
 * Purpose: Lets any staff member set how many battery bays of a station can
 *          be booked right now (for example fewer during maintenance).
 */
import { useState } from 'react'
import { Minus, Plus, Save } from 'lucide-react'
import { getErrorMessage } from '../../api/client'
import { setBatterySlots } from '../../api/stations'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import IconButton from '../../components/ui/IconButton'
import { useToast } from '../../context/ToastContext'
import BayMeter from './BayMeter'

// Bay counter with a Save button. The parent remounts it when the station changes.
export default function BatteryBaysControl({ station, onSaved }) {
  const toast = useToast()
  const [value, setValue] = useState(station.availableBatterySlots)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const total = station.totalBatterySlots

  // Sends the new number to the API.
  async function save() {
    setBusy(true)
    setError(null)
    try {
      const updated = await setBatterySlots(station.id, value)
      toast.success(`${updated.name}: ${updated.availableBatterySlots} of ${updated.totalBatterySlots} bays available.`)
      onSaved(updated)
    } catch (saveError) {
      setError(getErrorMessage(saveError))
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <IconButton
          icon={Minus}
          label="One bay less"
          variant="secondary"
          size="md"
          disabled={busy || value <= 0}
          onClick={() => setValue((current) => Math.max(0, current - 1))}
        />
        <p className="text-center">
          <output aria-live="polite" aria-label="Bays available" className="block font-heading text-5xl font-black text-ink tabular-nums">
            {value}
          </output>
          <span className="text-sm font-bold text-muted">of {total} bays available</span>
        </p>
        <IconButton
          icon={Plus}
          label="One bay more"
          variant="secondary"
          size="md"
          disabled={busy || value >= total}
          onClick={() => setValue((current) => Math.min(total, current + 1))}
        />
      </div>

      <BayMeter available={value} total={total} />

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => setValue(0)}>
          None (maintenance)
        </Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => setValue(total)}>
          All bays
        </Button>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <Button icon={Save} loading={busy} disabled={value === station.availableBatterySlots} onClick={save}>
        Save bays
      </Button>
    </div>
  )
}
