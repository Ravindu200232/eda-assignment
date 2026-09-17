/*
 * File:    StationActions.jsx
 * Module:  Microgrid Stations
 * Owner:   Nimthara
 * Purpose: Backoffice buttons for one station: edit, activate, deactivate
 *          (blocked by the API while bookings are active) and delete (only
 *          for stations that were never booked).
 */
import { useState } from 'react'
import { Pencil, Power, PowerOff, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router'
import { getErrorMessage } from '../../api/client'
import { activateStation, deactivateStation, deleteStation } from '../../api/stations'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useToast } from '../../context/ToastContext'

const ACTIONS = {
  deactivate: {
    title: 'Take this station out of service?',
    message: 'Prosumers will no longer see it and no new bookings can be made. Stations with active bookings cannot be deactivated.',
    confirm: 'Deactivate',
    tone: 'danger',
  },
  activate: {
    title: 'Bring this station back into service?',
    message: 'Prosumers will see the station again and can book its open slots.',
    confirm: 'Activate',
    tone: 'primary',
  },
  delete: {
    title: 'Delete this station?',
    message: 'The station and its empty slots are removed for good. Stations with any booking history cannot be deleted — deactivate them instead.',
    confirm: 'Delete station',
    tone: 'danger',
  },
}

// Action buttons. `onChanged` receives the updated station.
export default function StationActions({ station, onChanged }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const current = pending ? ACTIONS[pending] : null

  // Opens the confirmation for one action.
  function ask(action) {
    setError(null)
    setPending(action)
  }

  // Runs the confirmed action through the API.
  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      if (pending === 'delete') {
        await deleteStation(station.id)
        toast.success(`${station.name} was deleted.`)
        navigate('/stations', { replace: true })
        return
      }
      const updated = pending === 'activate' ? await activateStation(station.id) : await deactivateStation(station.id)
      toast.success(`${updated.name} is now ${updated.status === 'Active' ? 'in service' : 'out of service'}.`)
      setPending(null)
      onChanged(updated)
    } catch (actionError) {
      setError(getErrorMessage(actionError))
    } finally {
      setBusy(false)
    }
  }

  const active = station.status === 'Active'

  return (
    <>
      <Button to={`/stations/${station.id}/edit`} variant="secondary" size="sm" icon={Pencil}>
        Edit
      </Button>
      {active ? (
        <Button variant="outline" size="sm" icon={PowerOff} onClick={() => ask('deactivate')}>
          Deactivate
        </Button>
      ) : (
        <Button variant="secondary" size="sm" icon={Power} onClick={() => ask('activate')}>
          Activate
        </Button>
      )}
      <Button variant="ghost" size="sm" icon={Trash2} onClick={() => ask('delete')}>
        Delete
      </Button>

      <ConfirmDialog
        open={current !== null}
        title={current?.title}
        message={current?.message}
        confirmLabel={current?.confirm}
        tone={current?.tone}
        busy={busy}
        error={error}
        onConfirm={confirm}
        onClose={() => setPending(null)}
      />
    </>
  )
}
