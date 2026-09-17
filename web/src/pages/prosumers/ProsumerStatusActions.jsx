/*
 * File:    ProsumerStatusActions.jsx
 * Module:  Prosumer Accounts
 * Owner:   Malith
 * Purpose: Activate, reactivate, reject and deactivate buttons for one
 *          prosumer, each with a confirmation. Staff can deactivate or reject;
 *          only Backoffice users see Activate and Reactivate.
 */
import { useState } from 'react'
import { Power, PowerOff, UserCheck, UserX } from 'lucide-react'
import { getErrorMessage } from '../../api/client'
import { activateProsumer, deactivateProsumer } from '../../api/prosumers'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useAuth } from '../../context/AuthContext'
import { useNavBadges } from '../../context/NavBadgesContext'
import { useToast } from '../../context/ToastContext'
import { Roles } from '../../utils/roles'

const ACTIONS = {
  activate: {
    label: 'Activate',
    icon: UserCheck,
    variant: 'primary',
    title: 'Activate this account?',
    message: (name) => `${name} will be able to log in to the mobile app and book energy.`,
    done: (name) => `${name} is now active.`,
    run: activateProsumer,
  },
  reactivate: {
    label: 'Reactivate',
    icon: Power,
    variant: 'secondary',
    title: 'Reactivate this account?',
    message: (name) => `${name} will be able to log in and book energy again.`,
    done: (name) => `${name} is active again.`,
    run: activateProsumer,
  },
  reject: {
    label: 'Reject',
    icon: UserX,
    variant: 'outline',
    title: 'Reject this sign-up?',
    message: (name) => `${name}'s sign-up will be closed and the account deactivated.`,
    done: (name) => `${name}'s sign-up was rejected.`,
    run: deactivateProsumer,
  },
  deactivate: {
    label: 'Deactivate',
    icon: PowerOff,
    variant: 'outline',
    title: 'Deactivate this account?',
    message: (name) => `${name} will not be able to log in until a Backoffice user reactivates the account.`,
    done: (name) => `${name} is now deactivated.`,
    run: deactivateProsumer,
  },
}

// Picks the actions that fit the account status and the user's role.
function actionsFor(status, isBackoffice) {
  if (status === 'Pending') return isBackoffice ? ['activate', 'reject'] : ['reject']
  if (status === 'Deactivated') return isBackoffice ? ['reactivate'] : []
  return ['deactivate']
}

// Buttons for one prosumer. `onChanged` receives the updated account.
export default function ProsumerStatusActions({ prosumer, onChanged, size = 'sm' }) {
  const { user } = useAuth()
  const toast = useToast()
  const { refresh: refreshBadges } = useNavBadges()
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const isBackoffice = user.role === Roles.Backoffice
  const actions = actionsFor(prosumer.status, isBackoffice)
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
      const updated = await current.run(prosumer.nic)
      toast.success(current.done(prosumer.fullName))
      setPending(null)
      refreshBadges()
      onChanged(updated)
    } catch (actionError) {
      setError(getErrorMessage(actionError))
    } finally {
      setBusy(false)
    }
  }

  if (actions.length === 0) {
    return <span className="text-xs font-semibold text-muted">Only Backoffice can reactivate</span>
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {actions.map((action) => {
          const { label, icon, variant } = ACTIONS[action]
          return (
            <Button key={action} variant={variant} size={size} icon={icon} onClick={() => ask(action)}>
              {label}
            </Button>
          )
        })}
      </div>

      <ConfirmDialog
        open={current !== null}
        title={current?.title}
        message={current?.message(prosumer.fullName)}
        confirmLabel={current?.label}
        tone={pending === 'deactivate' || pending === 'reject' ? 'danger' : 'primary'}
        busy={busy}
        error={error}
        onConfirm={confirm}
        onClose={() => setPending(null)}
      />
    </>
  )
}
