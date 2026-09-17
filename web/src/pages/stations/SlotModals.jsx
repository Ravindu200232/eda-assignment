/*
 * File:    SlotModals.jsx
 * Module:  Energy Slots
 * Owner:   Nimthara
 * Purpose: Dialogs to add one slot, fill a week with slots, and change a
 *          slot's capacity or open/closed state. The API checks every rule
 *          (future times, opening hours, overlaps, booked bays).
 */
import { useState } from 'react'
import { CalendarPlus, Save, WandSparkles } from 'lucide-react'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import { createSlot, generateSlots, updateSlot } from '../../api/slots'
import Button from '../../components/ui/Button'
import Field from '../../components/ui/Field'
import FormAlert from '../../components/ui/FormAlert'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Select from '../../components/ui/Select'
import Switch from '../../components/ui/Switch'
import { formatTimeRange, formatDate, nextLocalDates } from '../../utils/format'
import { HALF_HOURS } from './schedule'

const TIME_OPTIONS = HALF_HOURS.map((time) => ({ value: time, label: time }))
const LENGTH_OPTIONS = [30, 60, 90, 120, 180, 240, 360, 480].map((minutes) => ({
  value: String(minutes),
  label: minutes < 60 ? `${minutes} minutes` : `${minutes / 60} hour${minutes === 60 ? '' : 's'}`,
}))
const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7].map((days) => ({ value: String(days), label: `${days} day${days === 1 ? '' : 's'}` }))

// Turns the optional capacity box into a number or null.
function optionalCount(text) {
  return String(text).trim() === '' ? null : Number(text)
}

// Shared footer with Cancel and the main button.
function DialogButtons({ busy, onCancel, icon, label }) {
  return (
    <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <Button variant="ghost" onClick={onCancel} disabled={busy}>
        Cancel
      </Button>
      <Button type="submit" icon={icon} loading={busy}>
        {label}
      </Button>
    </div>
  )
}

// Runs a save call and keeps the form's error state.
function useSave() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  // Calls `request`; returns its result or null when it failed.
  async function run(request) {
    setBusy(true)
    setError(null)
    setFieldErrors({})
    try {
      return await request()
    } catch (saveError) {
      setFieldErrors(getFieldErrors(saveError))
      setError(getErrorMessage(saveError))
      return null
    } finally {
      setBusy(false)
    }
  }

  return { busy, error, fieldErrors, run }
}

// Dialog to add one slot.
export function AddSlotModal({ open, station, onClose, onSaved }) {
  return (
    <Modal open={open} onClose={onClose} title="Add a slot" description={`${station.name} · times are Sri Lanka time`}>
      <AddSlotForm station={station} onCancel={onClose} onSaved={onSaved} />
    </Modal>
  )
}

// Form for one slot. Dates run from today to 30 days ahead.
function AddSlotForm({ station, onCancel, onSaved }) {
  const [today] = nextLocalDates(1)
  const [lastDay] = nextLocalDates(31).slice(-1)
  const [form, setForm] = useState({ date: today, startTime: '08:00', endTime: '10:00', capacity: '' })
  const save = useSave()

  // Keeps the typed values.
  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  // Sends the new slot.
  async function handleSubmit(event) {
    event.preventDefault()
    const slot = await save.run(() =>
      createSlot(station.id, { ...form, capacity: optionalCount(form.capacity) }),
    )
    if (slot) onSaved(`Slot added for ${formatDate(slot.startTime)}, ${formatTimeRange(slot.startTime, slot.endTime)}.`, slot.startTime)
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <FormAlert error={save.error} fieldErrors={save.fieldErrors} />
      <Field label="Date" error={save.fieldErrors.date} required>
        <Input name="date" type="date" min={today} max={lastDay} value={form.date} onChange={handleChange} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Start time" error={save.fieldErrors.startTime} required>
          <Select name="startTime" options={TIME_OPTIONS} value={form.startTime} onChange={handleChange} />
        </Field>
        <Field label="End time" error={save.fieldErrors.endTime} required>
          <Select name="endTime" options={TIME_OPTIONS} value={form.endTime} onChange={handleChange} />
        </Field>
      </div>
      <Field
        label="Bays in this slot"
        error={save.fieldErrors.capacity}
        hint={`Leave empty to offer all ${station.availableBatterySlots} available bays.`}
      >
        <Input name="capacity" type="number" min="1" max={station.availableBatterySlots} value={form.capacity} onChange={handleChange} />
      </Field>
      <DialogButtons busy={save.busy} onCancel={onCancel} icon={CalendarPlus} label="Add slot" />
    </form>
  )
}

// Dialog that fills the opening hours with slots for up to 7 days.
export function GenerateSlotsModal({ open, station, onClose, onSaved }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate slots"
      description="Fills the station's opening hours with slots of one length. Times that already have a slot are skipped."
    >
      <GenerateForm station={station} onCancel={onClose} onSaved={onSaved} />
    </Modal>
  )
}

// Form for slot generation.
function GenerateForm({ station, onCancel, onSaved }) {
  const [today] = nextLocalDates(1)
  const [form, setForm] = useState({ fromDate: today, days: '7', slotMinutes: '120', capacity: '' })
  const save = useSave()

  // Keeps the chosen values.
  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  // Asks the API to create the slots.
  async function handleSubmit(event) {
    event.preventDefault()
    const result = await save.run(() =>
      generateSlots(station.id, {
        fromDate: form.fromDate || null,
        days: Number(form.days),
        slotMinutes: Number(form.slotMinutes),
        capacity: optionalCount(form.capacity),
      }),
    )
    if (result) {
      const skipped = result.skipped ? ` (${result.skipped} skipped because the time was already taken)` : ''
      onSaved(`${result.created} slot${result.created === 1 ? '' : 's'} created${skipped}.`, result.slots?.[0]?.startTime)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <FormAlert error={save.error} fieldErrors={save.fieldErrors} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First day" error={save.fieldErrors.fromDate}>
          <Input name="fromDate" type="date" min={today} value={form.fromDate} onChange={handleChange} />
        </Field>
        <Field label="Number of days" error={save.fieldErrors.days}>
          <Select name="days" options={DAY_OPTIONS} value={form.days} onChange={handleChange} />
        </Field>
        <Field label="Slot length" error={save.fieldErrors.slotMinutes}>
          <Select name="slotMinutes" options={LENGTH_OPTIONS} value={form.slotMinutes} onChange={handleChange} />
        </Field>
        <Field label="Bays per slot" error={save.fieldErrors.capacity} hint={`Empty = all ${station.availableBatterySlots} available bays`}>
          <Input name="capacity" type="number" min="1" max={station.availableBatterySlots} value={form.capacity} onChange={handleChange} />
        </Field>
      </div>
      <DialogButtons busy={save.busy} onCancel={onCancel} icon={WandSparkles} label="Generate slots" />
    </form>
  )
}

// Dialog to change a slot's capacity or close it.
export function EditSlotModal({ slot, station, onClose, onSaved }) {
  return (
    <Modal
      open={slot !== null}
      onClose={onClose}
      title="Change slot"
      description={slot ? `${formatDate(slot.startTime)} · ${formatTimeRange(slot.startTime, slot.endTime)}` : undefined}
    >
      {slot && <EditSlotForm slot={slot} station={station} onCancel={onClose} onSaved={onSaved} />}
    </Modal>
  )
}

// Form for one slot's capacity and open state.
function EditSlotForm({ slot, station, onCancel, onSaved }) {
  const [capacity, setCapacity] = useState(String(slot.capacity))
  const [isOpen, setIsOpen] = useState(slot.isOpen)
  const save = useSave()

  // Saves the changes.
  async function handleSubmit(event) {
    event.preventDefault()
    const updated = await save.run(() => updateSlot(slot.id, { capacity: optionalCount(capacity), isOpen }))
    if (updated) onSaved('Slot updated.')
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <FormAlert error={save.error} fieldErrors={save.fieldErrors} />
      <Field
        label="Bays in this slot"
        error={save.fieldErrors.capacity}
        hint={`At least ${Math.max(slot.bookedCount, 1)} (already booked: ${slot.bookedCount}), at most ${station.totalBatterySlots}.`}
        required
      >
        <Input
          type="number"
          min={Math.max(slot.bookedCount, 1)}
          max={station.totalBatterySlots}
          value={capacity}
          onChange={(event) => setCapacity(event.target.value)}
        />
      </Field>
      <div className="flex flex-col gap-1">
        <Switch checked={isOpen} onChange={setIsOpen} label="Open for booking" onText="Open for booking" offText="Closed for booking" />
        <p className="text-sm text-muted">Slots with bookings cannot be closed.</p>
      </div>
      <DialogButtons busy={save.busy} onCancel={onCancel} icon={Save} label="Save slot" />
    </form>
  )
}
