/*
 * File:    StationFormPage.jsx
 * Module:  Microgrid Stations
 * Owner:   Nimthara
 * Purpose: Backoffice form to add a station or change its details and GPS
 *          location. A new station also gets its weekly opening hours here.
 */
import { useState } from 'react'
import { Clock, MapPin, Save, Zap } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import { createStation, getStation, updateStation } from '../../api/stations'
import LocationPicker from '../../components/maps/LocationPicker'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Field from '../../components/ui/Field'
import FormAlert from '../../components/ui/FormAlert'
import Input from '../../components/ui/Input'
import PageHeader from '../../components/ui/PageHeader'
import { PageLoader } from '../../components/ui/Spinner'
import { useToast } from '../../context/ToastContext'
import { useApi } from '../../hooks/useApi'
import { formatNumber } from '../../utils/format'
import ScheduleEditor from './ScheduleEditor'
import { rowsToSchedule, scheduleToRows } from './schedule'

// Turns a form value into a number, or null when the box is empty.
function toNumber(text) {
  return String(text).trim() === '' ? null : Number(text)
}

// Page wrapper: loads the station when editing.
export default function StationFormPage() {
  const { id } = useParams()
  const station = useApi(() => (id ? getStation(id) : Promise.resolve(null)), [id])

  if (id && station.loading && !station.data) return <PageLoader label="Loading station…" />
  if (id && !station.data) {
    return (
      <>
        <PageHeader title="Edit station" backTo="/stations" backLabel="All stations" />
        <Card>
          <EmptyState icon={MapPin} color="pink" title="Station not found" message={station.error} action={<Button to="/stations">Back to stations</Button>} />
        </Card>
      </>
    )
  }

  return <StationForm key={station.data?.id ?? 'new'} station={station.data} />
}

// The form itself.
function StationForm({ station }) {
  const isEdit = Boolean(station)
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState({
    code: station?.code ?? '',
    name: station?.name ?? '',
    address: station?.address ?? '',
    latitude: station ? String(station.latitude) : '',
    longitude: station ? String(station.longitude) : '',
    solarCapacityKw: station ? String(station.solarCapacityKw) : '',
    storageCapacityKwh: station ? String(station.storageCapacityKwh) : '',
    totalBatterySlots: station ? String(station.totalBatterySlots) : '',
  })
  const [hours, setHours] = useState(() => scheduleToRows())
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const backTo = isEdit ? `/stations/${station.id}` : '/stations'

  // Keeps the typed values.
  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  // Saves through the API, then opens the station.
  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    const schedule = rowsToSchedule(hours)
    if (!isEdit && schedule.length === 0) {
      setError('Open the station on at least one day.')
      return
    }

    const details = {
      code: form.code,
      name: form.name,
      address: form.address,
      latitude: toNumber(form.latitude),
      longitude: toNumber(form.longitude),
      solarCapacityKw: toNumber(form.solarCapacityKw),
      storageCapacityKwh: toNumber(form.storageCapacityKwh),
      totalBatterySlots: toNumber(form.totalBatterySlots),
    }

    setBusy(true)
    try {
      const saved = isEdit ? await updateStation(station.id, details) : await createStation({ ...details, schedule })
      toast.success(isEdit ? `${saved.name} was updated.` : `${saved.name} was added.`)
      navigate(`/stations/${saved.id}`, { replace: true })
    } catch (saveError) {
      setFieldErrors(getFieldErrors(saveError))
      setError(getErrorMessage(saveError))
      setBusy(false)
    }
  }

  const storage = toNumber(form.storageCapacityKwh)
  const bays = toNumber(form.totalBatterySlots)
  const perBooking = storage > 0 && bays > 0 ? storage / bays : null

  return (
    <>
      <PageHeader
        eyebrow="Energy network"
        title={isEdit ? `Edit ${station.name}` : 'New station'}
        documentTitle={isEdit ? 'Edit station' : 'New station'}
        description="Everything here is checked by the server before it is saved."
        backTo={backTo}
        backLabel={isEdit ? 'Back to the station' : 'All stations'}
      />

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-8">
        <FormAlert error={error} fieldErrors={fieldErrors} />

        <div className="grid items-start gap-8 xl:grid-cols-2">
          <Card title="Station details" icon={Zap} iconColor="violet">
            <div className="flex flex-col gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Station code" error={fieldErrors.code} hint="e.g. SSG-MAL-01" required>
                  <Input name="code" value={form.code} onChange={handleChange} autoComplete="off" />
                </Field>
                <Field label="Station name" error={fieldErrors.name} required>
                  <Input name="name" value={form.name} onChange={handleChange} />
                </Field>
              </div>
              <Field label="Address" error={fieldErrors.address} required>
                <Input name="address" value={form.address} onChange={handleChange} autoComplete="street-address" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="Solar capacity (kW)" error={fieldErrors.solarCapacityKw} required>
                  <Input name="solarCapacityKw" type="number" inputMode="decimal" min="0" step="0.1" value={form.solarCapacityKw} onChange={handleChange} />
                </Field>
                <Field label="Storage (kWh)" error={fieldErrors.storageCapacityKwh} required>
                  <Input name="storageCapacityKwh" type="number" inputMode="decimal" min="0" step="0.1" value={form.storageCapacityKwh} onChange={handleChange} />
                </Field>
                <Field label="Battery bays" error={fieldErrors.totalBatterySlots} required>
                  <Input name="totalBatterySlots" type="number" inputMode="numeric" min="1" step="1" value={form.totalBatterySlots} onChange={handleChange} />
                </Field>
              </div>
              <p className="rounded-tile bg-well/70 px-4 py-3 text-sm font-medium text-muted" aria-live="polite">
                {perBooking
                  ? `Each booking can use up to about ${formatNumber(perBooking)} kWh (storage divided by bays).`
                  : 'Enter the storage and the number of bays to see how much energy one booking can use.'}
              </p>
            </div>
          </Card>

          <Card title="Location" icon={MapPin} iconColor="pink">
            <LocationPicker
              latitude={form.latitude}
              longitude={form.longitude}
              errors={fieldErrors}
              onChange={(point) => setForm((current) => ({ ...current, ...point }))}
            />
          </Card>
        </div>

        {!isEdit && (
          <Card title="Opening hours" description="Slots can only be created inside these hours. You can change them later." icon={Clock} iconColor="amber">
            <ScheduleEditor rows={hours} onChange={setHours} disabled={busy} />
          </Card>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button to={backTo} variant="ghost">
            Cancel
          </Button>
          <Button type="submit" size="lg" icon={Save} loading={busy}>
            {isEdit ? 'Save changes' : 'Create station'}
          </Button>
        </div>
      </form>
    </>
  )
}
