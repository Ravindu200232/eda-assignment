/*
 * File:    BookingWizardPage.jsx
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: Staff book a slot for a prosumer, or change a booking, in five
 *          steps: prosumer, station, day (next 7 days), free slot, and energy
 *          with the trade type. The API checks the 7-day and 12-hour rules,
 *          free bays and how much energy one battery bay can hold.
 */
import { useState } from 'react'
import { BatteryCharging, Building2, CalendarCheck, CalendarDays, CalendarX2, Clock, Save, UserRound } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import { listProsumers } from '../../api/prosumers'
import { createReservation, getReservation, updateReservation } from '../../api/reservations'
import { listSlots } from '../../api/slots'
import { listStations } from '../../api/stations'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Field from '../../components/ui/Field'
import FormAlert from '../../components/ui/FormAlert'
import Input from '../../components/ui/Input'
import PageHeader from '../../components/ui/PageHeader'
import SearchInput from '../../components/ui/SearchInput'
import { SkeletonRows } from '../../components/ui/Skeleton'
import { PageLoader } from '../../components/ui/Spinner'
import { useToast } from '../../context/ToastContext'
import { useApi } from '../../hooks/useApi'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { formatDate, formatDateTime, formatDayKey, formatKwh, formatTimeRange, localDateKey, nextLocalDates } from '../../utils/format'
import { BOOKING_RULES, TRADE_TYPES } from './bookingDetails'
import ChoiceCard from './ChoiceCard'

const DAYS_AHEAD = 7

// Loads the free slots of one station on one day, tagged with what was asked.
async function loadFreeSlots(stationId, day) {
  if (!stationId || !day) return { key: '', slots: [] }
  const slots = await listSlots(stationId, { from: day, to: day, onlyAvailable: true })
  return { key: `${stationId}|${day}`, slots }
}

// The free slots plus, when changing a booking, its own slot (even if that slot is now full).
function slotChoicesFor(slots, booking, stationId, day) {
  const list = slots.map((slot) => ({ ...slot, current: slot.id === booking?.slotId }))
  const ownSlotShown = booking && booking.stationId === stationId && localDateKey(booking.startTime) === day
  if (ownSlotShown && !list.some((slot) => slot.id === booking.slotId)) {
    list.push({ id: booking.slotId, startTime: booking.startTime, endTime: booking.endTime, current: true })
  }
  return list.sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
}

// Page wrapper: loads the booking when changing one.
export default function BookingWizardPage() {
  const { id } = useParams()
  const booking = useApi(() => (id ? getReservation(id) : Promise.resolve(null)), [id])

  if (id && booking.loading && !booking.data) return <PageLoader label="Loading booking…" />

  if (id && !booking.data) {
    return (
      <>
        <PageHeader title="Change booking" backTo="/reservations" backLabel="All bookings" />
        <Card>
          <EmptyState
            icon={CalendarX2}
            color="pink"
            title="Booking not found"
            message={booking.error}
            action={<Button to="/reservations">Back to bookings</Button>}
          />
        </Card>
      </>
    )
  }

  if (booking.data && !booking.data.canModify) return <LockedBooking booking={booking.data} />

  return <BookingWizard key={booking.data?.id ?? 'new'} booking={booking.data} />
}

// Shown instead of the form when a booking can no longer be changed.
function LockedBooking({ booking }) {
  return (
    <>
      <PageHeader
        eyebrow="Change booking"
        title={booking.referenceNo}
        documentTitle="Change booking"
        backTo={`/reservations/${booking.id}`}
        backLabel="Back to the booking"
      />
      <Card>
        <EmptyState
          icon={CalendarX2}
          color="amber"
          title="This booking can no longer be changed"
          message={`Only pending or approved bookings can be changed, and only until 12 hours before the start (${formatDateTime(booking.modifyDeadline)}).`}
          action={<Button to={`/reservations/${booking.id}`}>Open the booking</Button>}
        />
      </Card>
    </>
  )
}

// The five-step form.
function BookingWizard({ booking }) {
  const isEdit = Boolean(booking)
  const navigate = useNavigate()
  const toast = useToast()
  const [days] = useState(() => {
    const next = nextLocalDates(DAYS_AHEAD)
    const own = booking && localDateKey(booking.startTime)
    return own && !next.includes(own) ? [...next, own] : next
  })
  const [prosumer, setProsumer] = useState(isEdit ? { nic: booking.prosumerNic, fullName: booking.prosumerName } : null)
  const [stationId, setStationId] = useState(booking?.stationId ?? '')
  const [day, setDay] = useState(isEdit ? localDateKey(booking.startTime) : days[0])
  const [slotId, setSlotId] = useState(booking?.slotId ?? '')
  const [energy, setEnergy] = useState(isEdit ? String(booking.energyKwh) : '')
  const [tradeType, setTradeType] = useState(booking?.tradeType ?? '')
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const stations = useApi(() => listStations({ status: 'Active' }), [])
  const freeSlots = useApi(() => loadFreeSlots(stationId, day), [stationId, day])

  const station = (stations.data ?? []).find((item) => item.id === stationId) ?? null
  const slotsReady = freeSlots.data?.key === `${stationId}|${day}`
  const slotChoices = slotsReady ? slotChoicesFor(freeSlots.data.slots, booking, stationId, day) : []
  const slot = slotChoices.find((item) => item.id === slotId) ?? null
  const energyValue = Number(energy)
  const tooMuch = station && energyValue > station.bayCapacityKwh
  const ready = Boolean(prosumer && station && slot && energyValue > 0 && tradeType)
  const backTo = isEdit ? `/reservations/${booking.id}` : '/reservations'

  // A new station or day needs a new slot.
  function chooseStation(value) {
    setStationId(value)
    setSlotId('')
  }

  // Picks another day.
  function chooseDay(value) {
    setDay(value)
    setSlotId('')
  }

  // Books or saves through the API, then opens the booking.
  async function handleSubmit(event) {
    event.preventDefault()
    if (!ready) return

    setBusy(true)
    setError(null)
    setFieldErrors({})
    const details = { slotId, energyKwh: energyValue, tradeType }
    try {
      const saved = isEdit
        ? await updateReservation(booking.id, details)
        : await createReservation({ ...details, prosumerNic: prosumer.nic })
      toast.success(
        isEdit
          ? `${saved.referenceNo} was changed and waits for approval again.`
          : `Booking ${saved.referenceNo} was made and waits for approval.`,
      )
      navigate(`/reservations/${saved.id}`, { replace: true })
    } catch (saveError) {
      setFieldErrors(getFieldErrors(saveError))
      setError(getErrorMessage(saveError))
      setBusy(false)
      // The slot may have filled up in the meantime.
      freeSlots.reload()
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={isEdit ? `Change ${booking.referenceNo}` : 'Daily work'}
        title={isEdit ? 'Change booking' : 'New booking'}
        description={`Book a battery bay for a prosumer. ${BOOKING_RULES}.`}
        backTo={backTo}
        backLabel={isEdit ? 'Back to the booking' : 'All bookings'}
      />

      <form noValidate onSubmit={handleSubmit} className="grid items-start gap-8 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-8 xl:col-span-2">
          <Card title="1. Prosumer" icon={UserRound} iconColor="violet">
            <ProsumerStep prosumer={prosumer} locked={isEdit} error={fieldErrors.prosumerNic} onChange={setProsumer} />
          </Card>

          <Card title="2. Station" description="Stations that are in service right now." icon={Building2} iconColor="pink">
            <StationStep stations={stations} stationId={stationId} onChange={chooseStation} missing={isEdit && stations.data && !station} />
          </Card>

          <Card title="3. Day" description="Bookings can be made for today and the next six days." icon={CalendarDays} iconColor="sky">
            <div role="radiogroup" aria-label="Day" className="flex flex-wrap gap-2">
              {days.map((key, index) => (
                <ChoiceCard
                  key={key}
                  name="day"
                  value={key}
                  checked={day === key}
                  onChange={chooseDay}
                  label={formatDayKey(key)}
                  className="min-w-32"
                >
                  {index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : undefined}
                </ChoiceCard>
              ))}
            </div>
          </Card>

          <Card title="4. Slot" description="Only slots with a free battery bay are shown." icon={Clock} iconColor="amber">
            <SlotStep
              station={station}
              freeSlots={freeSlots}
              ready={slotsReady}
              choices={slotChoices}
              slotId={slotId}
              error={fieldErrors.slotId}
              onChange={setSlotId}
            />
          </Card>

          <Card title="5. Energy" icon={BatteryCharging} iconColor="emerald">
            <div className="flex flex-col gap-5">
              <Field
                label="Energy (kWh)"
                required
                error={fieldErrors.energyKwh ?? (tooMuch ? `At most ${formatKwh(station.bayCapacityKwh)} fits in one battery bay at this station.` : undefined)}
                hint={station ? `One booking can use up to ${formatKwh(station.bayCapacityKwh)} at this station.` : 'Choose a station to see the limit.'}
              >
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0.1"
                  step="0.1"
                  max={station?.bayCapacityKwh}
                  value={energy}
                  onChange={(event) => setEnergy(event.target.value)}
                />
              </Field>
              <div role="radiogroup" aria-label="Trade type" className="grid gap-3 sm:grid-cols-2">
                {TRADE_TYPES.map((type) => (
                  <ChoiceCard
                    key={type.value}
                    name="tradeType"
                    value={type.value}
                    checked={tradeType === type.value}
                    onChange={setTradeType}
                    label={type.label}
                  >
                    {type.description}
                  </ChoiceCard>
                ))}
              </div>
              {fieldErrors.tradeType && <p className="text-sm font-semibold text-pink-700">{fieldErrors.tradeType}</p>}
            </div>
          </Card>
        </div>

        <Card title="Summary" icon={CalendarCheck} iconColor="violet" className="xl:sticky xl:top-32">
          <dl className="flex flex-col gap-3 text-sm">
            <SummaryRow label="Prosumer" value={prosumer ? `${prosumer.fullName} (${prosumer.nic})` : null} />
            <SummaryRow label="Station" value={station?.name} />
            <SummaryRow label="Day" value={slot ? formatDate(slot.startTime) : formatDayKey(day)} />
            <SummaryRow label="Slot" value={slot && formatTimeRange(slot.startTime, slot.endTime)} />
            <SummaryRow label="Energy" value={energyValue > 0 ? formatKwh(energyValue) : null} />
            <SummaryRow label="Trade" value={tradeType || null} />
          </dl>
          <p className="mt-5 rounded-tile bg-well/70 px-4 py-3 text-sm font-medium text-muted">
            {isEdit
              ? 'A changed booking goes back to "Pending approval", and its old QR code stops working.'
              : 'New bookings wait for approval by a Grid Operator or Backoffice user.'}
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <FormAlert error={error} fieldErrors={fieldErrors} />
            <Button type="submit" size="lg" fullWidth icon={isEdit ? Save : CalendarCheck} loading={busy} disabled={!ready}>
              {isEdit ? 'Save changes' : 'Book this slot'}
            </Button>
            <Button to={backTo} variant="ghost" fullWidth>
              Cancel
            </Button>
          </div>
        </Card>
      </form>
    </>
  )
}

// Step 1: find an active prosumer by name, NIC or email (fixed when changing a booking).
function ProsumerStep({ prosumer, locked, error, onChange }) {
  const [search, setSearch] = useState('')
  const searchText = useDebouncedValue(search.trim())
  const results = useApi(
    async () =>
      searchText.length < 2
        ? { search: searchText, items: [] }
        : { search: searchText, items: (await listProsumers({ search: searchText, status: 'Active', pageSize: 5 })).items },
    [searchText],
  )

  if (prosumer) {
    return (
      <div className="flex flex-col gap-3 rounded-tile bg-well/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="block font-heading font-extrabold text-ink">{prosumer.fullName}</span>
          <span className="font-mono text-sm text-muted">{prosumer.nic}</span>
        </p>
        {locked ? (
          <span className="text-sm font-medium text-muted">A booking always stays with the same prosumer.</span>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => onChange(null)}>
            Choose someone else
          </Button>
        )}
        {error && <p className="text-sm font-semibold text-pink-700">{error}</p>}
      </div>
    )
  }

  const shown = results.data?.search === searchText ? results.data.items : null

  return (
    <div className="flex flex-col gap-4">
      <SearchInput value={search} onChange={setSearch} label="Find the prosumer" placeholder="Name, NIC or email" />
      {searchText.length < 2 ? (
        <p className="text-sm font-medium text-muted">Type at least two letters or digits. Only active accounts can book.</p>
      ) : results.error ? (
        <Alert tone="danger">{results.error}</Alert>
      ) : !shown ? (
        <SkeletonRows rows={2} />
      ) : shown.length === 0 ? (
        <p className="text-sm font-medium text-muted">No active prosumer matches "{searchText}".</p>
      ) : (
        <ul aria-label="Matching prosumers" className="grid gap-3 sm:grid-cols-2">
          {shown.map((person) => (
            <li key={person.nic}>
              <button
                type="button"
                onClick={() => onChange(person)}
                className="flex w-full flex-col gap-1 rounded-tile bg-white/80 px-4 py-3 text-left shadow-clay-row transition-all duration-200 hover:-translate-y-0.5 hover:bg-white focus-visible:ring-4 focus-visible:ring-accent/30 focus-visible:outline-none"
              >
                <span className="font-heading font-extrabold text-ink">{person.fullName}</span>
                <span className="text-sm font-medium text-muted">
                  {person.nic} · {person.email}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm font-semibold text-pink-700">{error}</p>}
    </div>
  )
}

// Step 2: active stations as cards.
function StationStep({ stations, stationId, onChange, missing }) {
  if (stations.error) return <Alert tone="danger">{stations.error}</Alert>
  if (!stations.data) return <SkeletonRows rows={2} />

  return (
    <div className="flex flex-col gap-4">
      {missing && (
        <Alert tone="warning">The booking's station is out of service now. Choose another station to move the booking.</Alert>
      )}
      <div role="radiogroup" aria-label="Station" className="grid gap-3 md:grid-cols-2">
        {stations.data.map((station) => (
          <ChoiceCard
            key={station.id}
            name="station"
            value={station.id}
            checked={stationId === station.id}
            disabled={station.availableBatterySlots === 0}
            onChange={onChange}
            label={station.name}
          >
            {station.address} · {station.availableBatterySlots} of {station.totalBatterySlots} bays free · up to{' '}
            {formatKwh(station.bayCapacityKwh)} a booking
          </ChoiceCard>
        ))}
      </div>
    </div>
  )
}

// Step 4: free slots of the chosen station and day.
function SlotStep({ station, freeSlots, ready, choices, slotId, error, onChange }) {
  let content
  if (!station) {
    content = <p className="text-sm font-medium text-muted">Choose a station first.</p>
  } else if (freeSlots.error) {
    content = <Alert tone="danger">{freeSlots.error}</Alert>
  } else if (!ready) {
    content = <SkeletonRows rows={2} />
  } else if (choices.length === 0) {
    content = <EmptyState icon={CalendarX2} color="amber" title="No free slots on this day" message="Try another day or another station." />
  } else {
    content = (
      <div role="radiogroup" aria-label="Free slots" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {choices.map((slot) => (
          <ChoiceCard
            key={slot.id}
            name="slot"
            value={slot.id}
            checked={slotId === slot.id}
            onChange={onChange}
            label={formatTimeRange(slot.startTime, slot.endTime)}
          >
            {slot.current ? 'This booking’s slot' : `${slot.availableBays} of ${slot.capacity} bays free`}
          </ChoiceCard>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {content}
      {error && <p className="text-sm font-semibold text-pink-700">{error}</p>}
    </div>
  )
}

// One line of the summary.
function SummaryRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="font-heading text-xs font-extrabold tracking-wide text-muted uppercase">{label}</dt>
      <dd className={value ? 'text-right font-semibold text-ink' : 'text-right text-muted'}>{value || 'Not chosen yet'}</dd>
    </div>
  )
}
