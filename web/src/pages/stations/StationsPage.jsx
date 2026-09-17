/*
 * File:    StationsPage.jsx
 * Module:  Microgrid Stations
 * Owner:   Nimthara
 * Purpose: All battery stations as a list or on a map, with status filter
 *          and search. Backoffice users can add new stations here.
 */
import { useState } from 'react'
import { ArrowRight, Building2, List, Map as MapIcon, MapPinned, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { listStations } from '../../api/stations'
import StationMap from '../../components/maps/StationMap'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import DataTable from '../../components/ui/DataTable'
import EmptyState from '../../components/ui/EmptyState'
import IconOrb from '../../components/ui/IconOrb'
import PageHeader from '../../components/ui/PageHeader'
import SearchInput from '../../components/ui/SearchInput'
import StatusBadge from '../../components/ui/StatusBadge'
import Tabs from '../../components/ui/Tabs'
import { useAuth } from '../../context/AuthContext'
import { useApi } from '../../hooks/useApi'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { formatKw, formatKwh } from '../../utils/format'
import { BACKOFFICE_ONLY, hasRole } from '../../utils/roles'
import BayMeter from './BayMeter'
import { describeHours, hoursFor, todayName } from './schedule'

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'Active', label: 'In service' },
  { value: 'Inactive', label: 'Out of service' },
]

const VIEW_TABS = [
  { value: 'list', label: 'List' },
  { value: 'map', label: 'Map' },
]

// Station list page.
export default function StationsPage() {
  const { user } = useAuth()
  const isBackoffice = hasRole(user, BACKOFFICE_ONLY)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [view, setView] = useState('list')
  const [selectedId, setSelectedId] = useState(null)
  const searchText = useDebouncedValue(search.trim())
  const stations = useApi(() => listStations({ status: status || undefined, search: searchText || undefined }), [status, searchText])

  const list = stations.data ?? []
  const today = todayName()
  const selected = list.find((station) => station.id === selectedId) ?? null
  const activeCount = list.filter((station) => station.status === 'Active').length

  const columns = [
    {
      key: 'name',
      header: 'Station',
      primary: true,
      render: (station) => (
        <div className="flex items-center gap-3 text-left">
          <IconOrb icon={Building2} color={station.status === 'Active' ? 'violet' : 'blue'} size="sm" />
          <span className="min-w-0">
            <Link to={`/stations/${station.id}`} className="block font-heading font-extrabold text-ink hover:text-accent hover:underline">
              {station.name}
            </Link>
            <span className="block truncate text-sm text-muted">
              <span className="font-mono font-bold">{station.code}</span> · {station.address}
            </span>
          </span>
        </div>
      ),
    },
    {
      key: 'capacity',
      header: 'Solar / storage',
      className: 'whitespace-nowrap',
      render: (station) => (
        <span>
          {formatKw(station.solarCapacityKw)}
          <span className="block text-xs text-muted">{formatKwh(station.storageCapacityKwh)} storage</span>
        </span>
      ),
    },
    {
      key: 'bays',
      header: 'Battery bays',
      render: (station) => <BayMeter available={station.availableBatterySlots} total={station.totalBatterySlots} />,
    },
    {
      key: 'bay',
      header: 'Per booking',
      className: 'hidden whitespace-nowrap 2xl:table-cell',
      render: (station) => `up to ${formatKwh(station.bayCapacityKwh)}`,
    },
    {
      key: 'today',
      header: 'Today',
      className: 'whitespace-nowrap',
      render: (station) => describeHours(hoursFor(station, today)),
    },
    {
      key: 'status',
      header: 'Status',
      render: (station) => <StatusBadge status={station.status} label={station.status === 'Active' ? 'In service' : 'Out of service'} />,
    },
  ]

  const empty = (
    <EmptyState
      icon={MapPinned}
      title={searchText || status ? 'No stations match' : 'No stations yet'}
      message={searchText || status ? 'Try another name, code or status.' : 'Add the first battery station to start taking bookings.'}
    />
  )

  return (
    <>
      <PageHeader
        eyebrow="Energy network"
        title="Stations"
        description={
          stations.data
            ? `${activeCount} of ${list.length} shown stations are in service. Open a station to manage its hours, battery bays and slots.`
            : 'Battery stations where prosumers export or import energy.'
        }
        actions={
          isBackoffice && (
            <Button to="/stations/new" icon={Plus}>
              New station
            </Button>
          )
        }
      />

      <Card>
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            label="Search stations"
            placeholder="Name, code or address"
            className="flex-1"
          />
          <div className="flex flex-col gap-4 sm:flex-row">
            <Tabs label="Filter by status" tabs={STATUS_TABS} value={status} onChange={setStatus} />
            <Tabs
              label="View"
              tabs={VIEW_TABS.map((tab) => ({ ...tab, label: <ViewLabel icon={tab.value === 'list' ? List : MapIcon} text={tab.label} /> }))}
              value={view}
              onChange={setView}
            />
          </div>
        </div>

        {view === 'list' ? (
          <DataTable
            caption="Stations"
            columns={columns}
            rows={stations.data}
            loading={stations.loading}
            error={stations.error}
            onRetry={stations.reload}
            empty={empty}
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-3">
            <StationMap
              stations={list}
              selectedId={selectedId}
              onSelect={(station) => setSelectedId(station.id)}
              label="Map of stations"
              className="xl:col-span-2"
            />
            <SelectedStation station={selected} />
          </div>
        )}
      </Card>
    </>
  )
}

// Icon and word for the list/map switch.
function ViewLabel({ icon: Icon, text }) {
  return (
    <>
      <Icon aria-hidden="true" className="size-4" />
      {text}
    </>
  )
}

// Details of the station picked on the map.
function SelectedStation({ station }) {
  if (!station) {
    return (
      <div className="flex items-center justify-center rounded-tile bg-well/70 p-6 text-center">
        <EmptyState icon={MapPinned} color="violet" title="Pick a station" message="Click a pin on the map to see the station here." />
      </div>
    )
  }

  return (
    <div aria-live="polite" className="flex flex-col gap-4 rounded-tile bg-white/80 p-6 shadow-clay-card">
      <div>
        <p className="font-mono text-sm font-bold text-accent">{station.code}</p>
        <h2 className="font-heading text-2xl font-extrabold text-ink">{station.name}</h2>
        <p className="mt-1 text-sm font-medium text-muted">{station.address}</p>
      </div>
      <StatusBadge status={station.status} label={station.status === 'Active' ? 'In service' : 'Out of service'} className="self-start" />
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="font-heading font-extrabold text-muted">Solar</dt>
          <dd className="font-medium text-ink">{formatKw(station.solarCapacityKw)}</dd>
        </div>
        <div>
          <dt className="font-heading font-extrabold text-muted">Storage</dt>
          <dd className="font-medium text-ink">{formatKwh(station.storageCapacityKwh)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="font-heading font-extrabold text-muted">Battery bays</dt>
          <dd>
            <BayMeter available={station.availableBatterySlots} total={station.totalBatterySlots} />
          </dd>
        </div>
      </dl>
      <Button to={`/stations/${station.id}`} iconRight={ArrowRight}>
        Open station
      </Button>
    </div>
  )
}
