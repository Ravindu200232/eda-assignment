/*
 * File:    PendingActivationsPage.jsx
 * Module:  Prosumer Accounts
 * Owner:   Malith
 * Purpose: Backoffice queue of prosumers who signed up in the mobile app and
 *          wait for activation, oldest first. Each sign-up can be activated
 *          or rejected.
 */
import { useState } from 'react'
import { IdCard, Mail, MapPin, Phone, Sun, UserCheck, UserX, Zap } from 'lucide-react'
import { Link } from 'react-router'
import { getErrorMessage } from '../../api/client'
import { activateProsumer, deactivateProsumer, listPendingActivations } from '../../api/prosumers'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import PageHeader from '../../components/ui/PageHeader'
import Skeleton from '../../components/ui/Skeleton'
import { useNavBadges } from '../../context/NavBadgesContext'
import { useToast } from '../../context/ToastContext'
import { useApi } from '../../hooks/useApi'
import { formatDateTime, formatKw, formatTimeAgo, initials } from '../../utils/format'

// Activation queue page.
export default function PendingActivationsPage() {
  const toast = useToast()
  const { refresh: refreshBadges } = useNavBadges()
  const signUps = useApi(listPendingActivations, [])
  const [busyNic, setBusyNic] = useState(null)
  const [rejecting, setRejecting] = useState(null)
  const [rejectError, setRejectError] = useState(null)
  const [actionError, setActionError] = useState(null)

  // Takes a handled sign-up off the list and updates the menu counter.
  function removeFromQueue(nic) {
    signUps.setData((list) => list.filter((person) => person.nic !== nic))
    refreshBadges()
  }

  // Activates one sign-up straight away.
  async function activate(person) {
    setBusyNic(person.nic)
    setActionError(null)
    try {
      await activateProsumer(person.nic)
      removeFromQueue(person.nic)
      toast.success(`${person.fullName} can now log in to the mobile app.`)
    } catch (error) {
      setActionError(getErrorMessage(error))
    } finally {
      setBusyNic(null)
    }
  }

  // Rejects the sign-up after confirmation.
  async function confirmReject() {
    setBusyNic(rejecting.nic)
    setRejectError(null)
    try {
      await deactivateProsumer(rejecting.nic)
      removeFromQueue(rejecting.nic)
      toast.success(`${rejecting.fullName}'s sign-up was rejected.`)
      setRejecting(null)
    } catch (error) {
      setRejectError(getErrorMessage(error))
    } finally {
      setBusyNic(null)
    }
  }

  const list = signUps.data ?? []

  return (
    <>
      <PageHeader
        eyebrow="Backoffice"
        title="Pending activations"
        description="New prosumer sign-ups from the mobile app, oldest first. Check the details, then activate or reject each one."
      />

      {(signUps.error || actionError) && (
        <Alert tone="danger" className="mb-6">
          {signUps.error ?? actionError}
        </Alert>
      )}

      {signUps.loading && !signUps.data ? (
        <div role="status" aria-label="Loading sign-ups" className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
          <Skeleton className="h-80 rounded-card" />
          <Skeleton className="h-80 rounded-card" />
        </div>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={UserCheck}
            color="emerald"
            title="All caught up"
            message="There are no sign-ups waiting. New ones from the mobile app will appear here."
          />
        </Card>
      ) : (
        <ul aria-label="Sign-ups waiting for activation" className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
          {list.map((person) => (
            <li key={person.nic}>
              <SignUpCard
                person={person}
                busy={busyNic === person.nic}
                onActivate={() => activate(person)}
                onReject={() => {
                  setRejectError(null)
                  setRejecting(person)
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={rejecting !== null}
        title="Reject this sign-up?"
        message={rejecting && `${rejecting.fullName}'s account will be deactivated and cannot be used to book energy.`}
        confirmLabel="Reject sign-up"
        tone="danger"
        busy={busyNic !== null && busyNic === rejecting?.nic}
        error={rejectError}
        onConfirm={confirmReject}
        onClose={() => setRejecting(null)}
      />
    </>
  )
}

// One sign-up with its details and the two decisions.
function SignUpCard({ person, busy, onActivate, onReject }) {
  const rows = [
    { icon: IdCard, label: 'NIC', value: person.nic },
    { icon: Mail, label: 'Email', value: person.email },
    { icon: Phone, label: 'Phone', value: person.phone },
    { icon: MapPin, label: 'Address', value: person.address ?? '—' },
    { icon: Zap, label: 'Meter', value: person.meterNumber ?? '—' },
    { icon: Sun, label: 'Solar', value: person.solarCapacityKw != null ? formatKw(person.solarCapacityKw) : '—' },
  ]

  return (
    <Card as="article" interactive className="h-full" aria-label={`Sign-up from ${person.fullName}`}>
      <div className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 animate-clay-breathe items-center justify-center rounded-full bg-linear-to-br from-pink-400 to-violet-500 font-heading text-xl font-black text-white shadow-clay-button">
          {initials(person.fullName)}
        </span>
        <div className="min-w-0">
          <Link
            to={`/prosumers/${encodeURIComponent(person.nic)}`}
            className="block truncate font-heading text-xl font-extrabold text-ink hover:text-accent hover:underline"
          >
            {person.fullName}
          </Link>
          <p className="text-sm font-medium text-muted" title={formatDateTime(person.createdAt)}>
            Signed up {formatTimeAgo(person.createdAt)}
          </p>
        </div>
      </div>

      <dl className="mt-5 flex flex-1 flex-col gap-2">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-3 text-sm">
            <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
            <dt className="w-16 shrink-0 font-heading font-extrabold text-muted">{label}</dt>
            <dd className="min-w-0 font-medium break-words text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button icon={UserCheck} onClick={onActivate} loading={busy} className="sm:flex-1">
          Activate
        </Button>
        <Button variant="outline" icon={UserX} onClick={onReject} disabled={busy}>
          Reject
        </Button>
      </div>
    </Card>
  )
}
