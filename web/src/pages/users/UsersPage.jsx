/*
 * File:    UsersPage.jsx
 * Module:  Staff Users
 * Owner:   Ravindu
 * Purpose: Backoffice page to list, search, create, edit, activate and
 *          deactivate Backoffice and Grid Operator accounts.
 */
import { useState } from 'react'
import { Pencil, Power, PowerOff, UserPlus, Users } from 'lucide-react'
import { getErrorMessage } from '../../api/client'
import { listUsers, setUserStatus } from '../../api/users'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import DataTable from '../../components/ui/DataTable'
import EmptyState from '../../components/ui/EmptyState'
import IconButton from '../../components/ui/IconButton'
import PageHeader from '../../components/ui/PageHeader'
import Pagination from '../../components/ui/Pagination'
import SearchInput from '../../components/ui/SearchInput'
import Select from '../../components/ui/Select'
import StatusBadge from '../../components/ui/StatusBadge'
import Tabs from '../../components/ui/Tabs'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useApi } from '../../hooks/useApi'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { formatDateTime, initials } from '../../utils/format'
import { STAFF_ROLE_OPTIONS } from '../../utils/roles'
import UserFormModal from './UserFormModal'

const PAGE_SIZE = 10

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'Active', label: 'Active' },
  { value: 'Deactivated', label: 'Deactivated' },
]

// Staff user management page.
export default function UsersPage() {
  const { user: me, refreshUser } = useAuth()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [statusTarget, setStatusTarget] = useState(null)
  const [statusBusy, setStatusBusy] = useState(false)
  const [statusError, setStatusError] = useState(null)
  const searchText = useDebouncedValue(search.trim())

  const users = useApi(
    () => listUsers({ search: searchText || undefined, role: role || undefined, status: status || undefined, page, pageSize: PAGE_SIZE }),
    [searchText, role, status, page],
  )

  // Runs a filter change and goes back to page 1.
  const onFilter = (setter) => (value) => {
    setter(value)
    setPage(1)
  }

  // Called by the form dialog after a successful save.
  function handleSaved(saved, wasEdit) {
    setEditing(null)
    toast.success(wasEdit ? `${saved.fullName} was updated.` : `${saved.fullName} can now log in.`)
    if (saved.nic === me.nic) refreshUser().catch(() => {})
    users.reload()
  }

  // Opens the activate / deactivate confirmation.
  function askStatusChange(user) {
    setStatusError(null)
    setStatusTarget(user)
  }

  // Sends the status change after confirmation.
  async function confirmStatusChange() {
    const activate = statusTarget.status !== 'Active'
    setStatusBusy(true)
    setStatusError(null)
    try {
      const saved = await setUserStatus(statusTarget.nic, activate)
      toast.success(`${saved.fullName} is now ${activate ? 'active' : 'deactivated'}.`)
      setStatusTarget(null)
      users.reload()
    } catch (error) {
      setStatusError(getErrorMessage(error))
    } finally {
      setStatusBusy(false)
    }
  }

  const columns = [
    {
      key: 'fullName',
      header: 'Name',
      primary: true,
      render: (user) => (
        <div className="flex items-center gap-3 text-left">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-sky-400 to-violet-500 font-heading text-sm font-black text-white">
            {initials(user.fullName)}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2 font-heading font-extrabold text-ink">
              {user.fullName}
              {user.nic === me.nic && <StatusBadge label="You" tone="accent" />}
            </span>
            <span className="block truncate text-sm text-muted">{user.email}</span>
          </span>
        </div>
      ),
    },
    { key: 'nic', header: 'NIC', render: (user) => <span className="font-mono text-sm">{user.nic}</span> },
    { key: 'phone', header: 'Phone', className: 'hidden 2xl:table-cell' },
    { key: 'role', header: 'Role', render: (user) => <StatusBadge status={user.role} /> },
    { key: 'status', header: 'Status', render: (user) => <StatusBadge status={user.status} /> },
    {
      key: 'lastLoginAt',
      header: 'Last login',
      className: 'whitespace-nowrap',
      render: (user) => (user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Never'),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (user) => (
        <div className="flex items-center justify-end gap-2">
          {user.nic !== me.nic &&
            (user.status === 'Active' ? (
              <Button variant="outline" size="sm" icon={PowerOff} onClick={() => askStatusChange(user)}>
                Deactivate
              </Button>
            ) : (
              <Button variant="secondary" size="sm" icon={Power} onClick={() => askStatusChange(user)}>
                Activate
              </Button>
            ))}
          <IconButton icon={Pencil} label={`Edit ${user.fullName}`} onClick={() => setEditing(user)} />
        </div>
      ),
    },
  ]

  const activating = statusTarget?.status !== 'Active'
  const filtered = Boolean(searchText || role || status)

  return (
    <>
      <PageHeader
        eyebrow="Backoffice"
        title="Staff users"
        description="Backoffice and Grid Operator accounts that can use this portal. Prosumers are managed on the Prosumers page."
        actions={
          <Button icon={UserPlus} onClick={() => setEditing('new')}>
            New staff user
          </Button>
        }
      />

      <Card padding="md">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center">
          <SearchInput
            value={search}
            onChange={onFilter(setSearch)}
            label="Search staff users"
            placeholder="Name, NIC or email"
            className="flex-1"
          />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Select
              aria-label="Filter by role"
              placeholder="All roles"
              options={STAFF_ROLE_OPTIONS}
              value={role}
              onChange={(event) => onFilter(setRole)(event.target.value)}
              className="sm:w-52"
            />
            <Tabs label="Filter by status" tabs={STATUS_TABS} value={status} onChange={onFilter(setStatus)} />
          </div>
        </div>

        <DataTable
          caption="Staff users"
          rowKey="nic"
          columns={columns}
          rows={users.data?.items}
          loading={users.loading}
          error={users.error}
          onRetry={users.reload}
          empty={
            <EmptyState
              icon={Users}
              title={filtered ? 'No staff users match' : 'No staff users yet'}
              message={filtered ? 'Try another name, role or status.' : 'Create the first Grid Operator account to get started.'}
            />
          }
        />

        <Pagination
          page={users.data?.page ?? page}
          totalPages={users.data?.totalPages ?? 1}
          total={users.data?.total ?? 0}
          itemLabel="staff users"
          onPageChange={setPage}
        />
      </Card>

      <UserFormModal
        open={editing !== null}
        user={editing === 'new' ? null : editing}
        isSelf={editing !== null && editing !== 'new' && editing.nic === me.nic}
        onClose={() => setEditing(null)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={statusTarget !== null}
        title={activating ? 'Activate this account?' : 'Deactivate this account?'}
        message={
          statusTarget &&
          (activating
            ? `${statusTarget.fullName} will be able to log in again.`
            : `${statusTarget.fullName} will be signed out and cannot log in until the account is activated again.`)
        }
        confirmLabel={activating ? 'Activate' : 'Deactivate'}
        tone={activating ? 'primary' : 'danger'}
        busy={statusBusy}
        error={statusError}
        onConfirm={confirmStatusChange}
        onClose={() => setStatusTarget(null)}
      />
    </>
  )
}
