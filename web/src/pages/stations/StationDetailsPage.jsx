/*
 * File:    StationDetailsPage.jsx
 * Module:  Microgrid Stations
 * Owner:   Nimthara
 * Purpose: One station: overview and map, battery bays, weekly opening
 *          hours and the slots for the next seven days.
 */
import { useMemo, useState } from 'react'
import { BatteryCharging, Building2, Clock, MapPin, Save } from 'lucide-react'
import { useParams } from 'react-router'
import { getErrorMessage } from '../../api/client'
import { getStation, updateSchedule } from '../../api/stations'
import StationMap from '../../components/maps/StationMap'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'
import { PageLoader } from '../../components/ui/Spinner'
import StatusBadge from '../../components/ui/StatusBadge'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useApi } from '../../hooks/useApi'
import { cn } from '../../utils/cn'
import { formatKw, formatKwh, formatNumber } from '../../utils/format'
import { BACKOFFICE_ONLY, hasRole } from '../../utils/roles'
import BatteryBaysControl from './BatteryBaysControl'
import ScheduleEditor from './ScheduleEditor'
import SlotsPanel from './SlotsPanel'
import StationActions from './StationActions'
import { WEEK_DAYS, describeHours, hoursFor, rowsToSchedule, scheduleToRows, todayName } from './schedule'

// Station details page.
export default function StationDetailsPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const isBackoffice = hasRole(user, BACKOFFICE_ONLY)
  const station = useApi(() => getStation(id), [id])
  const [editingHours, setEditingHours] = useState(false)
  const mapStations = useMemo(() => (station.data ? [station.data] : []), [station.data])

  if (station.loading && !station.data) return <PageLoader label="Loading station…" />

  if (!station.data) {
    return (
      <>
        <PageHeader title="Station" backTo="/stations" backLabel="All stations" />
        <Card>
          <EmptyState
            icon={MapPin}
            color="pink"
            title="Station not found"
            message={station.error}
            action={<Button to="/stations">Back to stations</Button>}
          />
        </Card>
      </>
    )
  }

  const current = station.data
  const figures = [
    { label: 'Solar capacity', value: formatKw(current.solarCapacityKw) },
    { label: 'Storage', value: formatKwh(current.storageCapacityKwh) },
    { label: 'Battery bays', value: formatNumber(current.totalBatterySlots) },
    { label: 'Per booking', value: `up to ${formatKwh(current.bayCapacityKwh)}` },
  ]

  return (
    <>
      <PageHeader
        eyebrow={current.code}
        title={current.name}
        backTo="/stations"
        backLabel="All stations"
        actions={isBackoffice && <StationActions station={current} onChanged={station.setData} />}
      />

      {station.error && (
        <Alert tone="danger" className="mb-6">
          {station.error}
        </Alert>
      )}

      <div className="grid items-start gap-8 xl:grid-cols-3">
        <Card
          title="Overview"
          icon={Building2}
          iconColor="violet"
          className="xl:col-span-2"
          actions={<StatusBadge status={current.status} label={current.status === 'Active' ? 'In service' : 'Out of service'} />}
        >
          <p className="font-medium text-ink">{current.address}</p>
          <p className="mt-1 font-mono text-sm text-muted">
            GPS {current.latitude.toFixed(5)}, {current.longitude.toFixed(5)}
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {figures.map((figure) => (
              <div key={figure.label} className="rounded-tile bg-well/70 px-4 py-3">
                <dt className="font-heading text-xs font-extrabold tracking-wide text-muted uppercase">{figure.label}</dt>
                <dd className="mt-1 font-heading text-xl font-black text-ink">{figure.value}</dd>
              </div>
            ))}
          </dl>
          <StationMap
            stations={mapStations}
            selectedId={current.id}
            label={`Map showing ${current.name}`}
            className="mt-6"
            mapClassName="h-64"
          />
        </Card>

        <Card title="Battery bays" description="How many bays can be booked right now." icon={BatteryCharging} iconColor="emerald">
          <BatteryBaysControl
            key={`${current.id}-${current.availableBatterySlots}`}
            station={current}
            onSaved={station.setData}
          />
        </Card>
      </div>

      <div className="mt-8 grid items-start gap-8 xl:grid-cols-3">
        <Card
          title="Opening hours"
          icon={Clock}
          iconColor="sky"
          actions={
            isBackoffice && (
              <Button size="sm" variant="secondary" onClick={() => setEditingHours(true)}>
                Edit hours
              </Button>
            )
          }
        >
          <WeeklyHours station={current} />
        </Card>
        <SlotsPanel station={current} className="xl:col-span-2" />
      </div>

      <HoursModal
        open={editingHours}
        station={current}
        onClose={() => setEditingHours(false)}
        onSaved={(saved) => {
          setEditingHours(false)
          station.setData(saved)
        }}
      />
    </>
  )
}

// The week's opening hours with today highlighted.
function WeeklyHours({ station }) {
  const today = todayName()
  return (
    <ul aria-label="Weekly opening hours" className="flex flex-col gap-1">
      {WEEK_DAYS.map((day) => {
        const isToday = day === today
        return (
          <li
            key={day}
            aria-current={isToday ? 'date' : undefined}
            className={cn(
              'flex items-center justify-between rounded-control px-4 py-2.5',
              isToday ? 'bg-linear-to-br from-accent-light to-accent font-bold text-white shadow-clay-button' : 'text-ink',
            )}
          >
            <span className="font-heading font-extrabold">{isToday ? `${day} (today)` : day}</span>
            <span className={cn('text-sm font-semibold tabular-nums', !isToday && 'text-muted')}>
              {describeHours(hoursFor(station, day))}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

// Dialog with the schedule editor (Backoffice only).
function HoursModal({ open, station, onClose, onSaved }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Opening hours"
      description="Existing slots stay as they are. New slots must fit inside these hours."
    >
      <HoursForm station={station} onCancel={onClose} onSaved={onSaved} />
    </Modal>
  )
}

// Editor form; saves the whole week at once.
function HoursForm({ station, onCancel, onSaved }) {
  const toast = useToast()
  const [rows, setRows] = useState(() => scheduleToRows(station.schedule))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Sends the week to the API.
  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const saved = await updateSchedule(station.id, rowsToSchedule(rows))
      toast.success(`Opening hours of ${saved.name} were saved.`)
      onSaved(saved)
    } catch (saveError) {
      setError(getErrorMessage(saveError))
      setBusy(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && <Alert tone="danger">{error}</Alert>}
      <ScheduleEditor rows={rows} onChange={setRows} disabled={busy} />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" icon={Save} loading={busy}>
          Save hours
        </Button>
      </div>
    </form>
  )
}
