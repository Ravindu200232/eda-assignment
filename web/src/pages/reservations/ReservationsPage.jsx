/*
 * File:    ReservationsPage.jsx
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: Staff view of all energy bookings: tabs for pending, current and
 *          past bookings, filters (station, status, prosumer NIC, dates),
 *          search and paging. Pending bookings can be approved or rejected
 *          straight from the list.
 * Source:  WEB-31 (React Router useSearchParams).
 */
import { useId, useState } from 'react'
import { CalendarClock, CalendarPlus, FilterX, SlidersHorizontal } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { listReservations } from '../../api/reservations'
import { listStations } from '../../api/stations'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import DataTable from '../../components/ui/DataTable'
import EmptyState from '../../components/ui/EmptyState'
import Field from '../../components/ui/Field'
import Input from '../../components/ui/Input'
import PageHeader from '../../components/ui/PageHeader'
import Pagination from '../../components/ui/Pagination'
import SearchInput from '../../components/ui/SearchInput'
import Select from '../../components/ui/Select'
import StatusBadge from '../../components/ui/StatusBadge'
import Tabs from '../../components/ui/Tabs'
import { useApi } from '../../hooks/useApi'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { cn } from '../../utils/cn'
import { bookingStatus, formatDate, formatKwh, formatTimeRange } from '../../utils/format'
import { BOOKING_RULES, BOOKING_STATUSES, BOOKING_TABS, canDecide, tabFor } from './bookingDetails'
import DecisionButtons from './DecisionButtons'

const PAGE_SIZE = 10
const NO_FILTERS = { stationId: '', status: '', nic: '', from: '', to: '' }

const EMPTY_TEXT = {
  pending: ['Nothing is waiting for approval', 'New bookings from the app and from staff appear here first.'],
  current: ['No approved bookings to come', 'Approved bookings stay here until their slot has ended.'],
  history: ['No past bookings yet', 'Completed, cancelled, rejected and missed bookings are kept here.'],
  all: ['No bookings yet', 'Use "New booking" to book a slot for a prosumer.'],
}

// Booking list page.
export default function ReservationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = tabFor(searchParams.get('tab'))
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(NO_FILTERS)
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filtersId = useId()
  const searchText = useDebouncedValue(search.trim())
  const nicText = useDebouncedValue(filters.nic.trim())
  const showStatus = !tab.scope || tab.value === 'history'

  const stations = useApi(() => listStations(), [])
  const bookings = useApi(
    () =>
      listReservations({
        scope: tab.scope,
        status: (showStatus && filters.status) || undefined,
        stationId: filters.stationId || undefined,
        nic: nicText || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        search: searchText || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    [tab.scope, showStatus, filters.status, filters.stationId, nicText, filters.from, filters.to, searchText, page],
  )

  // Switches the tab (kept in the address, so dashboard links can open a tab).
  function changeTab(value) {
    setSearchParams({ tab: value }, { replace: true })
    setPage(1)
  }

  // Changes one filter and goes back to page 1.
  function changeFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }))
    setPage(1)
  }

  // Clears the search and every filter.
  function clearFilters() {
    setSearch('')
    setFilters(NO_FILTERS)
    setPage(1)
  }

  const stationOptions = (stations.data ?? [])
    .map((station) => ({ value: station.id, label: station.name }))
    .sort((a, b) => a.label.localeCompare(b.label))
  const activeFilters = Object.values(filters).filter(Boolean).length
  const filtered = Boolean(search.trim() || activeFilters)
  const [emptyTitle, emptyMessage] = filtered ? ['No bookings match', 'Try another search or clear the filters.'] : EMPTY_TEXT[tab.value]

  const columns = [
    {
      key: 'booking',
      header: 'Booking',
      primary: true,
      render: (booking) => (
        <span className="block text-left">
          <Link to={`/reservations/${booking.id}`} className="font-mono font-bold text-accent hover:underline">
            {booking.referenceNo}
          </Link>
          <span className="block text-sm text-ink">{booking.prosumerName}</span>
          <span className="block font-mono text-xs text-muted">{booking.prosumerNic}</span>
        </span>
      ),
    },
    {
      key: 'slot',
      header: 'Station and slot',
      render: (booking) => (
        <span className="block">
          {booking.stationName}
          <span className="block text-xs whitespace-nowrap text-muted">
            {formatDate(booking.startTime)} · {formatTimeRange(booking.startTime, booking.endTime)}
          </span>
        </span>
      ),
    },
    {
      key: 'energy',
      header: 'Energy',
      className: 'whitespace-nowrap',
      render: (booking) => (
        <span className="inline-flex items-center gap-2">
          <StatusBadge status={booking.tradeType} />
          {formatKwh(booking.deliveredKwh ?? booking.energyKwh)}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (booking) => <StatusBadge status={bookingStatus(booking)} /> },
    {
      key: 'actions',
      header: '',
      render: (booking) => (
        <div className="flex items-center justify-end gap-2">
          {canDecide(booking) && <DecisionButtons compact booking={booking} onDone={bookings.reload} />}
          <Button to={`/reservations/${booking.id}`} variant="ghost" size="sm" aria-label={`Open ${booking.referenceNo}`}>
            Open
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Daily work"
        title="Reservations"
        description={`Energy bookings from the app and from staff. ${BOOKING_RULES}.`}
        actions={
          <Button to="/reservations/new" icon={CalendarPlus}>
            New booking
          </Button>
        }
      />

      <Card>
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center">
          <Tabs label="Booking lists" tabs={BOOKING_TABS} value={tab.value} onChange={changeTab} />
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
            label="Search bookings"
            placeholder="Reference, name, NIC, station"
            className="flex-1"
          />
        </div>

        {/* On phones the filters fold away so the bookings come first. */}
        <Button
          variant="secondary"
          size="sm"
          icon={SlidersHorizontal}
          className="mb-5 md:hidden"
          aria-expanded={filtersOpen}
          aria-controls={filtersId}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          {filtersOpen ? 'Hide filters' : `Filters${activeFilters ? ` (${activeFilters})` : ''}`}
        </Button>

        <div
          id={filtersId}
          className={cn(
            'mb-6 gap-4 rounded-tile bg-well/60 p-4 sm:grid-cols-2 xl:items-end',
            filtersOpen ? 'grid' : 'hidden md:grid',
            showStatus ? 'xl:grid-cols-[repeat(5,minmax(0,1fr))_auto]' : 'xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]',
          )}
        >
          <Field label="Station">
            <Select
              size="sm"
              placeholder="All stations"
              options={stationOptions}
              value={filters.stationId}
              onChange={(event) => changeFilter('stationId', event.target.value)}
            />
          </Field>
          {showStatus && (
            <Field label="Status">
              <Select
                size="sm"
                placeholder="Any status"
                options={BOOKING_STATUSES.map((status) => ({ value: status, label: status }))}
                value={filters.status}
                onChange={(event) => changeFilter('status', event.target.value)}
              />
            </Field>
          )}
          <Field label="Prosumer NIC">
            <Input size="sm" value={filters.nic} placeholder="Full NIC number" onChange={(event) => changeFilter('nic', event.target.value)} />
          </Field>
          <Field label="From date">
            <Input size="sm" type="date" value={filters.from} onChange={(event) => changeFilter('from', event.target.value)} />
          </Field>
          <Field label="To date">
            <Input size="sm" type="date" min={filters.from || undefined} value={filters.to} onChange={(event) => changeFilter('to', event.target.value)} />
          </Field>
          <Button variant="ghost" size="sm" icon={FilterX} disabled={!filtered} onClick={clearFilters}>
            Clear filters
          </Button>
        </div>

        <DataTable
          caption={`${tab.label} bookings`}
          columns={columns}
          rows={bookings.data?.items}
          loading={bookings.loading}
          error={bookings.error}
          onRetry={bookings.reload}
          empty={<EmptyState icon={CalendarClock} color="amber" title={emptyTitle} message={emptyMessage} />}
        />

        <Pagination
          page={bookings.data?.page ?? page}
          totalPages={bookings.data?.totalPages ?? 1}
          total={bookings.data?.total ?? 0}
          itemLabel="bookings"
          onPageChange={setPage}
        />
      </Card>
    </>
  )
}
