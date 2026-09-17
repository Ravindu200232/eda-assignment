/*
 * File:    ProsumersPage.jsx
 * Module:  Prosumer Accounts
 * Owner:   Malith
 * Purpose: Staff list of prosumers (solar home owners) with status tabs,
 *          search and paging. Staff can create, edit and deactivate accounts;
 *          Backoffice users can also activate and reactivate them.
 */
import { useState } from 'react'
import { Pencil, UserPlus, UsersRound } from 'lucide-react'
import { Link } from 'react-router'
import { listProsumers } from '../../api/prosumers'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import DataTable from '../../components/ui/DataTable'
import EmptyState from '../../components/ui/EmptyState'
import IconButton from '../../components/ui/IconButton'
import PageHeader from '../../components/ui/PageHeader'
import Pagination from '../../components/ui/Pagination'
import SearchInput from '../../components/ui/SearchInput'
import StatusBadge from '../../components/ui/StatusBadge'
import Tabs from '../../components/ui/Tabs'
import { useToast } from '../../context/ToastContext'
import { useApi } from '../../hooks/useApi'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { formatDate, formatKw, initials } from '../../utils/format'
import ProsumerFormModal from './ProsumerFormModal'
import ProsumerStatusActions from './ProsumerStatusActions'

const PAGE_SIZE = 10

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'Active', label: 'Active' },
  { value: 'Pending', label: 'Waiting for activation' },
  { value: 'Deactivated', label: 'Deactivated' },
]

// Prosumer management page.
export default function ProsumersPage() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const searchText = useDebouncedValue(search.trim())

  const prosumers = useApi(
    () => listProsumers({ search: searchText || undefined, status: status || undefined, page, pageSize: PAGE_SIZE }),
    [searchText, status, page],
  )

  // Changes a filter and goes back to page 1.
  const onFilter = (setter) => (value) => {
    setter(value)
    setPage(1)
  }

  // Called by the form after a successful save.
  function handleSaved(saved, wasEdit) {
    setEditing(null)
    toast.success(wasEdit ? `${saved.fullName} was updated.` : `${saved.fullName}'s account is ready to use.`)
    prosumers.reload()
  }

  const columns = [
    {
      key: 'fullName',
      header: 'Prosumer',
      primary: true,
      render: (prosumer) => (
        <div className="flex items-center gap-3 text-left">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-emerald-400 to-sky-500 font-heading text-sm font-black text-white">
            {initials(prosumer.fullName)}
          </span>
          <span className="min-w-0">
            <Link
              to={`/prosumers/${encodeURIComponent(prosumer.nic)}`}
              className="block font-heading font-extrabold text-ink hover:text-accent hover:underline"
            >
              {prosumer.fullName}
            </Link>
            <span className="block truncate text-sm text-muted">{prosumer.email}</span>
          </span>
        </div>
      ),
    },
    { key: 'nic', header: 'NIC', render: (prosumer) => <span className="font-mono text-sm">{prosumer.nic}</span> },
    { key: 'phone', header: 'Phone', className: 'hidden 2xl:table-cell' },
    {
      key: 'solar',
      header: 'Solar',
      className: 'whitespace-nowrap',
      render: (prosumer) => (
        <span>
          {prosumer.solarCapacityKw != null ? formatKw(prosumer.solarCapacityKw) : '—'}
          <span className="block text-xs text-muted">{prosumer.meterNumber ?? 'No meter number'}</span>
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (prosumer) => <StatusBadge status={prosumer.status} /> },
    {
      key: 'createdAt',
      header: 'Registered',
      className: 'hidden whitespace-nowrap 2xl:table-cell',
      render: (prosumer) => formatDate(prosumer.createdAt),
    },
    {
      key: 'actions',
      header: '',
      render: (prosumer) => (
        <div className="flex items-center justify-end gap-2">
          <ProsumerStatusActions prosumer={prosumer} onChanged={prosumers.reload} />
          <IconButton icon={Pencil} label={`Edit ${prosumer.fullName}`} onClick={() => setEditing(prosumer)} />
        </div>
      ),
    },
  ]

  const filtered = Boolean(searchText || status)

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Prosumers"
        description="Solar home owners who trade energy with the microgrid. The NIC number is each account's unique key."
        actions={
          <Button icon={UserPlus} onClick={() => setEditing('new')}>
            New prosumer
          </Button>
        }
      />

      <Card>
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center">
          <SearchInput
            value={search}
            onChange={onFilter(setSearch)}
            label="Search prosumers"
            placeholder="Name, NIC or email"
            className="flex-1"
          />
          <Tabs label="Filter by status" tabs={STATUS_TABS} value={status} onChange={onFilter(setStatus)} />
        </div>

        <DataTable
          caption="Prosumers"
          rowKey="nic"
          columns={columns}
          rows={prosumers.data?.items}
          loading={prosumers.loading}
          error={prosumers.error}
          onRetry={prosumers.reload}
          empty={
            <EmptyState
              icon={UsersRound}
              title={filtered ? 'No prosumers match' : 'No prosumers yet'}
              message={filtered ? 'Try another name, NIC or status.' : 'Prosumers appear here when they sign up in the app or are added by staff.'}
            />
          }
        />

        <Pagination
          page={prosumers.data?.page ?? page}
          totalPages={prosumers.data?.totalPages ?? 1}
          total={prosumers.data?.total ?? 0}
          itemLabel="prosumers"
          onPageChange={setPage}
        />
      </Card>

      <ProsumerFormModal
        open={editing !== null}
        prosumer={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={handleSaved}
      />
    </>
  )
}
