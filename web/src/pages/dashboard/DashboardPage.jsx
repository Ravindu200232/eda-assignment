/*
 * File:    DashboardPage.jsx
 * Module:  Dashboards
 * Owner:   Malith
 * Purpose: Backoffice home page with live numbers (pending and approved
 *          reservations, today's bookings, sign-ups to activate, stations and
 *          prosumers), the next bookings and quick actions.
 */
import { CalendarClock, ScanLine, Sparkles, UserCheck, UserPlus, UsersRound } from 'lucide-react'
import { getStaffSummary } from '../../api/dashboard'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import PageHeader from '../../components/ui/PageHeader'
import { SkeletonRows } from '../../components/ui/Skeleton'
import StatOrb from '../../components/ui/StatOrb'
import { useApi } from '../../hooks/useApi'
import { useAutoRefresh } from '../../hooks/useAutoRefresh'
import BookingList from './BookingList'
import LiveStatus from './LiveStatus'

// Backoffice dashboard.
export default function DashboardPage() {
  const summary = useApi(getStaffSummary, [])
  useAutoRefresh(summary.reload, 30000)

  const data = summary.data
  const waiting = summary.loading && !data

  const orbs = [
    { label: 'Waiting for approval', value: data?.pendingReservations, color: 'amber', to: '/reservations?tab=pending', hint: 'Pending bookings' },
    { label: 'Approved upcoming', value: data?.approvedFutureReservations, color: 'emerald', to: '/reservations?tab=current', hint: 'Not finished yet' },
    { label: "Today's bookings", value: data?.todaysReservations, color: 'sky', hint: 'Starting today (Sri Lanka time)' },
    { label: 'Sign-ups to activate', value: data?.pendingActivations, color: 'pink', to: '/activations', hint: 'From the mobile app' },
    { label: 'Active stations', value: data?.activeStations, color: 'violet', to: '/stations', hint: data ? `of ${data.totalStations} stations` : undefined },
    { label: 'Active prosumers', value: data?.activeProsumers, color: 'blue', to: '/prosumers', hint: 'Can book energy' },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Backoffice"
        title="Dashboard"
        description="Live numbers from the microgrid. They refresh by themselves every 30 seconds."
        actions={<LiveStatus generatedAt={data?.generatedAt} loading={summary.loading} onRefresh={summary.reload} />}
      />

      {summary.error && (
        <Alert tone="danger" title="Could not load the dashboard" className="mb-6">
          {summary.error}
        </Alert>
      )}

      <Card as="section" aria-label="Live numbers" className="mb-8">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 2xl:grid-cols-6">
          {orbs.map((orb) => (
            <StatOrb key={orb.label} {...orb} loading={waiting} />
          ))}
        </div>
      </Card>

      <div className="grid items-start gap-8 xl:grid-cols-3">
        <Card
          title="Next bookings"
          description="The next pending or approved bookings across all stations."
          icon={CalendarClock}
          iconColor="sky"
          className="xl:col-span-2"
        >
          {waiting ? (
            <SkeletonRows rows={3} />
          ) : (
            <BookingList
              label="Next bookings"
              bookings={data?.upcomingReservations}
              empty={<EmptyState icon={CalendarClock} title="No upcoming bookings" message="New bookings from prosumers will appear here." />}
            />
          )}
        </Card>

        <Card title="Quick actions" icon={Sparkles} iconColor="violet">
          <div className="flex flex-col gap-3">
            <Button to="/activations" icon={UserCheck} fullWidth>
              Review sign-ups{data?.pendingActivations ? ` (${data.pendingActivations})` : ''}
            </Button>
            <Button to="/prosumers" variant="secondary" icon={UsersRound} fullWidth>
              Manage prosumers
            </Button>
            <Button to="/users" variant="secondary" icon={UserPlus} fullWidth>
              Staff users
            </Button>
            <Button to="/check-in" variant="outline" icon={ScanLine} fullWidth>
              QR check-in
            </Button>
          </div>
        </Card>
      </div>
    </>
  )
}
