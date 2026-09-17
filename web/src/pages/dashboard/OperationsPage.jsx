/*
 * File:    OperationsPage.jsx
 * Module:  Dashboards
 * Owner:   Malith
 * Purpose: Grid Operator home page: live numbers, today's bookings at the
 *          stations (with a quick way to check approved ones in) and the
 *          next bookings.
 */
import { BatteryCharging, CalendarClock, CalendarDays, ScanLine, Sparkles, UsersRound } from 'lucide-react'
import { getBookingsForDay, getStaffSummary } from '../../api/dashboard'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import PageHeader from '../../components/ui/PageHeader'
import { SkeletonRows } from '../../components/ui/Skeleton'
import StatOrb from '../../components/ui/StatOrb'
import { useApi } from '../../hooks/useApi'
import { useAutoRefresh } from '../../hooks/useAutoRefresh'
import { localDateKey } from '../../utils/format'
import StationBaysCard from '../stations/StationBaysCard'
import BookingList from './BookingList'
import LiveStatus from './LiveStatus'

const HIDDEN_TODAY = ['Cancelled', 'Rejected']

// Loads the numbers and today's bookings together.
async function loadOperations() {
  const [summary, today] = await Promise.all([getStaffSummary(), getBookingsForDay(localDateKey())])
  const todaysBookings = today.items
    .filter((booking) => !HIDDEN_TODAY.includes(booking.status))
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
  return { summary, todaysBookings }
}

// Grid Operator dashboard.
export default function OperationsPage() {
  const operations = useApi(loadOperations, [])
  useAutoRefresh(operations.reload, 30000)

  const summary = operations.data?.summary
  const waiting = operations.loading && !operations.data

  const orbs = [
    { label: 'Waiting for approval', value: summary?.pendingReservations, color: 'amber', to: '/reservations?tab=pending', hint: 'Pending bookings' },
    { label: "Today's bookings", value: summary?.todaysReservations, color: 'sky', hint: 'Starting today' },
    { label: 'Approved upcoming', value: summary?.approvedFutureReservations, color: 'emerald', to: '/reservations?tab=current', hint: 'Ready for check-in' },
    { label: 'Active stations', value: summary?.activeStations, color: 'violet', to: '/stations', hint: summary ? `of ${summary.totalStations} stations` : undefined },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Grid Operator"
        title="Operations"
        description="Today's work at the stations: approvals, check-ins and battery bays. The numbers refresh every 30 seconds."
        actions={<LiveStatus generatedAt={summary?.generatedAt} loading={operations.loading} onRefresh={operations.reload} />}
      />

      {operations.error && (
        <Alert tone="danger" title="Could not load today's work" className="mb-6">
          {operations.error}
        </Alert>
      )}

      <Card as="section" aria-label="Live numbers" className="mb-8">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {orbs.map((orb) => (
            <StatOrb key={orb.label} {...orb} loading={waiting} />
          ))}
        </div>
      </Card>

      <div className="grid items-start gap-8 xl:grid-cols-3">
        <div className="flex flex-col gap-8 xl:col-span-2">
          <Card
            title="Today at the stations"
            description="Cancelled and rejected bookings are not shown."
            icon={CalendarDays}
            iconColor="emerald"
          >
            {waiting ? (
              <SkeletonRows rows={3} />
            ) : (
              <BookingList
                label="Today's bookings"
                bookings={operations.data?.todaysBookings}
                action={(booking) =>
                  booking.status === 'Approved' && !booking.isPast ? (
                    <Button to="/check-in" size="sm" icon={ScanLine}>
                      Check in
                    </Button>
                  ) : null
                }
                empty={<EmptyState icon={CalendarDays} title="No bookings today" message="Bookings that start today will appear here." />}
              />
            )}
          </Card>

          <Card title="Next bookings" description="The next pending or approved bookings." icon={CalendarClock} iconColor="sky">
            {waiting ? (
              <SkeletonRows rows={3} />
            ) : (
              <BookingList
                label="Next bookings"
                bookings={summary?.upcomingReservations}
                empty={<EmptyState icon={CalendarClock} title="No upcoming bookings" />}
              />
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-8">
          <Card title="Quick actions" icon={Sparkles} iconColor="violet">
            <div className="flex flex-col gap-3">
              <Button to="/check-in" icon={ScanLine} fullWidth>
                Open QR check-in
              </Button>
              <Button to="/stations" variant="secondary" icon={BatteryCharging} fullWidth>
                Stations and slots
              </Button>
              <Button to="/prosumers" variant="secondary" icon={UsersRound} fullWidth>
                Find a prosumer
              </Button>
            </div>
          </Card>
          {/* Added by Nimthara: battery bay shortcut */}
          <StationBaysCard />
        </div>
      </div>
    </>
  )
}
