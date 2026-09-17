/*
 * File:    SlotsPanel.jsx
 * Module:  Energy Slots
 * Owner:   Nimthara
 * Purpose: The station's bookable slots for today and the next six days.
 *          One day is shown at a time (day tabs), with add, generate,
 *          change and delete.
 */
import { useState } from 'react'
import { CalendarPlus, CalendarRange, Pencil, Trash2, WandSparkles } from 'lucide-react'
import { getErrorMessage } from '../../api/client'
import { deleteSlot, listSlots } from '../../api/slots'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import IconButton from '../../components/ui/IconButton'
import { SkeletonRows } from '../../components/ui/Skeleton'
import StatusBadge from '../../components/ui/StatusBadge'
import Tabs from '../../components/ui/Tabs'
import { useToast } from '../../context/ToastContext'
import { useApi } from '../../hooks/useApi'
import { formatDate, formatDayKey, formatTimeRange, localDateKey } from '../../utils/format'
import { groupSlotsByDay } from './schedule'
import { AddSlotModal, EditSlotModal, GenerateSlotsModal } from './SlotModals'

// Loads the slots and marks the ones that have already ended.
async function loadSlots(stationId) {
  const slots = await listSlots(stationId)
  const loadedAt = Date.now()
  return slots.map((slot) => ({ ...slot, finished: Date.parse(slot.endTime) <= loadedAt }))
}

// The day to show first: the first one that still has slots to come.
function firstUsefulDay(days) {
  return days.find((day) => day.slots.some((slot) => !slot.finished)) ?? days[0]
}

// Status word for a slot row.
function slotState(slot) {
  if (slot.finished) return { label: 'Finished', tone: 'neutral', finished: true }
  if (!slot.isOpen) return { label: 'Closed', tone: 'neutral' }
  if (slot.availableBays === 0) return { label: 'Full', tone: 'warning' }
  return { label: 'Open', tone: 'success' }
}

// Slots card for the station details page.
export default function SlotsPanel({ station, className }) {
  const toast = useToast()
  const slots = useApi(() => loadSlots(station.id), [station.id])
  const [chosenDay, setChosenDay] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [removeBusy, setRemoveBusy] = useState(false)
  const [removeError, setRemoveError] = useState(null)
  const canAdd = station.status === 'Active'

  // Closes a dialog after a change and reloads the list. `startTime` opens the day of a new slot.
  function handleSaved(message, startTime) {
    setDialog(null)
    setEditing(null)
    if (startTime) setChosenDay(localDateKey(startTime))
    toast.success(message)
    slots.reload()
  }

  // Deletes the chosen slot after confirmation.
  async function confirmRemove() {
    setRemoveBusy(true)
    setRemoveError(null)
    try {
      await deleteSlot(removing.id)
      toast.success('Slot deleted.')
      setRemoving(null)
      slots.reload()
    } catch (error) {
      setRemoveError(getErrorMessage(error))
    } finally {
      setRemoveBusy(false)
    }
  }

  const days = groupSlotsByDay(slots.data ?? [])
  const shownDay = days.find((day) => day.key === chosenDay) ?? firstUsefulDay(days)

  return (
    <Card
      title="Slots for the next 7 days"
      aria-label="Slots for the next 7 days"
      description="Bookable time windows. Prosumers can book open slots that still have free bays."
      icon={CalendarRange}
      iconColor="amber"
      className={className}
      actions={
        canAdd && (
          <>
            <Button size="sm" variant="secondary" icon={CalendarPlus} onClick={() => setDialog('add')}>
              Add slot
            </Button>
            <Button size="sm" icon={WandSparkles} onClick={() => setDialog('generate')}>
              Generate slots
            </Button>
          </>
        )
      }
    >
      {!canAdd && (
        <Alert tone="info" className="mb-4">
          This station is out of service, so no new slots can be added.
        </Alert>
      )}

      {slots.error && (
        <Alert tone="danger" title="Could not load the slots">
          {slots.error}
        </Alert>
      )}

      {slots.loading && !slots.data ? (
        <SkeletonRows rows={3} />
      ) : days.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          color="amber"
          title="No slots in the next 7 days"
          message={canAdd ? 'Use "Generate slots" to fill the opening hours in one go.' : undefined}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <Tabs
            label="Days with slots"
            tabs={days.map((day) => ({ value: day.key, label: formatDayKey(day.key), count: day.slots.length }))}
            value={shownDay.key}
            onChange={setChosenDay}
            className="self-start"
          />
          <section aria-label={shownDay.label}>
            <h3 className="mb-2 font-heading text-sm font-extrabold tracking-wide text-muted uppercase">{shownDay.label}</h3>
            <ul className="flex flex-col gap-2">
              {shownDay.slots.map((slot) => {
                const state = slotState(slot)
                const locked = state.finished
                return (
                  <li
                    key={slot.id}
                    aria-label={`Slot ${formatTimeRange(slot.startTime, slot.endTime)}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-tile bg-white/80 px-4 py-3 shadow-clay-row"
                  >
                    <span className="font-heading font-extrabold text-ink tabular-nums sm:w-32">
                      {formatTimeRange(slot.startTime, slot.endTime)}
                    </span>
                    {/* On phones the state goes to a second line so the buttons stay beside the time. */}
                    <span className="order-last flex basis-full flex-wrap items-center gap-2 sm:order-none sm:flex-1 sm:basis-0">
                      <StatusBadge label={state.label} tone={state.tone} />
                      <span className="text-sm font-medium text-muted">
                        {slot.bookedCount} of {slot.capacity} bays booked · {slot.availableBays} free
                      </span>
                    </span>
                    {!locked && (
                      <span className="ml-auto flex items-center gap-1">
                        <IconButton icon={Pencil} label="Change slot" onClick={() => setEditing(slot)} />
                        <IconButton
                          icon={Trash2}
                          label={slot.bookedCount > 0 ? 'Slots with bookings cannot be deleted' : 'Delete slot'}
                          variant="danger"
                          disabled={slot.bookedCount > 0}
                          onClick={() => {
                            setRemoveError(null)
                            setRemoving(slot)
                          }}
                        />
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      )}

      {canAdd && <AddSlotModal open={dialog === 'add'} station={station} onClose={() => setDialog(null)} onSaved={handleSaved} />}
      {canAdd && (
        <GenerateSlotsModal open={dialog === 'generate'} station={station} onClose={() => setDialog(null)} onSaved={handleSaved} />
      )}
      <EditSlotModal slot={editing} station={station} onClose={() => setEditing(null)} onSaved={handleSaved} />
      <ConfirmDialog
        open={removing !== null}
        title="Delete this slot?"
        message={removing && `${formatDate(removing.startTime)}, ${formatTimeRange(removing.startTime, removing.endTime)} will no longer be offered.`}
        confirmLabel="Delete slot"
        tone="danger"
        busy={removeBusy}
        error={removeError}
        onConfirm={confirmRemove}
        onClose={() => setRemoving(null)}
      />
    </Card>
  )
}
