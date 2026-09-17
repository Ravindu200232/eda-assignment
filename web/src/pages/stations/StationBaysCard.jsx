/*
 * File:    StationBaysCard.jsx
 * Module:  Microgrid Stations
 * Owner:   Nimthara
 * Purpose: Shortcut for the Grid Operator's Operations page: every station in
 *          service with one-click buttons to take a bay out of use or put it
 *          back. Each click is saved straight away.
 */
import { useState } from 'react'
import { BatteryCharging, Minus, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { getErrorMessage } from '../../api/client'
import { listStations, setBatterySlots } from '../../api/stations'
import Alert from '../../components/ui/Alert'
import Card from '../../components/ui/Card'
import IconButton from '../../components/ui/IconButton'
import { SkeletonRows } from '../../components/ui/Skeleton'
import { useApi } from '../../hooks/useApi'
import BayMeter from './BayMeter'

// Battery bay shortcut card.
export default function StationBaysCard() {
  const stations = useApi(() => listStations({ status: 'Active' }), [])
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)

  // Saves a new bay count for one station and updates the row.
  async function change(station, available) {
    setBusyId(station.id)
    setError(null)
    try {
      const updated = await setBatterySlots(station.id, available)
      stations.setData((list) => list.map((item) => (item.id === updated.id ? updated : item)))
    } catch (changeError) {
      setError(getErrorMessage(changeError))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Card title="Battery bays now" description="Saved straight away." icon={BatteryCharging} iconColor="emerald">
      {(error || stations.error) && (
        <Alert tone="danger" className="mb-4">
          {error ?? stations.error}
        </Alert>
      )}
      {stations.loading && !stations.data ? (
        <SkeletonRows rows={2} />
      ) : (
        <ul aria-label="Battery bays per station" className="flex flex-col gap-3">
          {(stations.data ?? []).map((station) => {
            const busy = busyId === station.id
            return (
              <li key={station.id} className="rounded-tile bg-white/80 p-3 shadow-clay-row">
                <Link to={`/stations/${station.id}`} className="block truncate font-heading font-extrabold text-ink hover:text-accent">
                  {station.name}
                </Link>
                <div className="mt-2 flex items-center gap-2">
                  <IconButton
                    icon={Minus}
                    label={`One bay less at ${station.name}`}
                    variant="secondary"
                    disabled={busy || station.availableBatterySlots <= 0}
                    onClick={() => change(station, station.availableBatterySlots - 1)}
                  />
                  <BayMeter available={station.availableBatterySlots} total={station.totalBatterySlots} className="flex-1" />
                  <IconButton
                    icon={Plus}
                    label={`One bay more at ${station.name}`}
                    variant="secondary"
                    disabled={busy || station.availableBatterySlots >= station.totalBatterySlots}
                    onClick={() => change(station, station.availableBatterySlots + 1)}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
