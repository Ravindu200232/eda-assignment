/*
 * File:    ProsumerDetailsPage.jsx
 * Module:  Prosumer Accounts
 * Owner:   Malith
 * Purpose: One prosumer's profile, account actions and bookings.
 */
import { useState } from 'react'
import { CalendarClock, IdCard, Mail, MapPin, Phone, Sun, UserRound, Zap } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { getProsumer, listProsumerBookings } from '../../api/prosumers'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import DataTable from '../../components/ui/DataTable'
import EmptyState from '../../components/ui/EmptyState'
import PageHeader from '../../components/ui/PageHeader'
import Pagination from '../../components/ui/Pagination'
import { PageLoader } from '../../components/ui/Spinner'
import StatusBadge from '../../components/ui/StatusBadge'
import { useToast } from '../../context/ToastContext'
import { useApi } from '../../hooks/useApi'
import { bookingStatus, formatDateTime, formatKw, formatKwh, formatSlot, initials } from '../../utils/format'
import ProsumerFormModal from './ProsumerFormModal'
import ProsumerStatusActions from './ProsumerStatusActions'

const PAGE_SIZE = 8

// Prosumer details page.
export default function ProsumerDetailsPage() {
  const { nic } = useParams()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const prosumer = useApi(() => getProsumer(nic), [nic])

  // Called by the edit form after saving.
  function handleSaved(saved) {
    setEditing(false)
    prosumer.setData(saved)
    toast.success(`${saved.fullName} was updated.`)
  }

  if (prosumer.loading && !prosumer.data) return <PageLoader label="Loading prosumer…" />

  if (!prosumer.data) {
    return (
      <>
        <PageHeader title="Prosumer" backTo="/prosumers" backLabel="All prosumers" />
        <Card>
          <EmptyState
            icon={UserRound}
            color="pink"
            title="Prosumer not found"
            message={prosumer.error}
            action={<Button to="/prosumers">Back to prosumers</Button>}
          />
        </Card>
      </>
    )
  }

  const person = prosumer.data
  const details = [
    { icon: IdCard, label: 'NIC', value: person.nic },
    { icon: Mail, label: 'Email', value: person.email },
    { icon: Phone, label: 'Phone', value: person.phone },
    { icon: MapPin, label: 'Address', value: person.address ?? '—' },
    { icon: Zap, label: 'Meter number', value: person.meterNumber ?? '—' },
    { icon: Sun, label: 'Solar capacity', value: person.solarCapacityKw != null ? formatKw(person.solarCapacityKw) : '—' },
  ]
  const history = [
    { label: 'Registered', value: formatDateTime(person.createdAt) },
    { label: 'Activated', value: formatDateTime(person.activatedAt) },
    { label: 'Deactivated', value: formatDateTime(person.deactivatedAt) },
    { label: 'Last login', value: formatDateTime(person.lastLoginAt) },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Prosumer"
        title={person.fullName}
        backTo="/prosumers"
        backLabel="All prosumers"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              Edit details
            </Button>
            <ProsumerStatusActions prosumer={person} onChanged={prosumer.setData} />
          </>
        }
      />

      {prosumer.error && (
        <Alert tone="danger" className="mb-6">
          {prosumer.error}
        </Alert>
      )}

      <div className="grid items-start gap-8 xl:grid-cols-3">
        <Card>
          <div className="flex items-center gap-4">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-emerald-400 to-sky-500 font-heading text-2xl font-black text-white shadow-clay-button">
              {initials(person.fullName)}
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-heading text-xl font-extrabold text-ink">{person.fullName}</h2>
              <StatusBadge status={person.status} className="mt-1" />
            </div>
          </div>

          <dl className="mt-6 flex flex-col gap-3">
            {details.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 rounded-tile bg-well/70 px-4 py-3">
                <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent" />
                <dt className="w-28 shrink-0 font-heading text-sm font-extrabold text-muted">{label}</dt>
                <dd className="min-w-0 font-medium break-words text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <dl className="mt-6 grid grid-cols-2 gap-4">
            {history.map(({ label, value }) => (
              <div key={label}>
                <dt className="font-heading text-xs font-extrabold tracking-wide text-muted uppercase">{label}</dt>
                <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <ProsumerBookings nic={person.nic} />
      </div>

      <ProsumerFormModal open={editing} prosumer={person} onClose={() => setEditing(false)} onSaved={handleSaved} />
    </>
  )
}

// Paged list of the prosumer's bookings, latest first.
function ProsumerBookings({ nic }) {
  const [page, setPage] = useState(1)
  const bookings = useApi(() => listProsumerBookings(nic, { page, pageSize: PAGE_SIZE }), [nic, page])

  const columns = [
    {
      key: 'referenceNo',
      header: 'Reference',
      primary: true,
      render: (booking) => (
        <Link to={`/reservations/${booking.id}`} className="font-mono text-sm font-bold text-accent hover:underline">
          {booking.referenceNo}
        </Link>
      ),
    },
    { key: 'stationName', header: 'Station' },
    { key: 'slot', header: 'Slot', render: (booking) => formatSlot(booking.startTime, booking.endTime) },
    {
      key: 'trade',
      header: 'Trade',
      className: 'whitespace-nowrap',
      render: (booking) => (
        <span className="inline-flex items-center gap-2">
          <StatusBadge status={booking.tradeType} />
          {formatKwh(booking.deliveredKwh ?? booking.energyKwh)}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (booking) => <StatusBadge status={bookingStatus(booking)} /> },
  ]

  return (
    <Card
      title="Bookings"
      description="All energy bookings of this prosumer, latest first."
      icon={CalendarClock}
      iconColor="sky"
      className="xl:col-span-2"
    >
      <DataTable
        caption="Prosumer bookings"
        columns={columns}
        rows={bookings.data?.items}
        loading={bookings.loading}
        error={bookings.error}
        onRetry={bookings.reload}
        empty={<EmptyState icon={CalendarClock} title="No bookings yet" message="Bookings made in the app or by staff will appear here." />}
      />
      <Pagination
        page={bookings.data?.page ?? page}
        totalPages={bookings.data?.totalPages ?? 1}
        total={bookings.data?.total ?? 0}
        itemLabel="bookings"
        onPageChange={setPage}
      />
    </Card>
  )
}
