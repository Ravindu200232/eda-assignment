/*
 * File:    HomePage.jsx
 * Module:  Dashboards (public home page)
 * Owner:   Malith
 * Purpose: The start page anyone can open: what the system does, live
 *          numbers from the microgrid, how trading works and what each
 *          type of user can do.
 * Source:  WEB-01 (claymorphism hero, bento grid and stat orbs).
 */
import {
  ArrowDown,
  BatteryCharging,
  CalendarClock,
  Check,
  Gauge,
  House,
  LogIn,
  MapPin,
  QrCode,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sun,
  UserCheck,
} from 'lucide-react'
import { getPublicSummary } from '../../api/dashboard'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import IconOrb from '../../components/ui/IconOrb'
import StatOrb from '../../components/ui/StatOrb'
import { useApi } from '../../hooks/useApi'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { formatNumber } from '../../utils/format'

const STEPS = [
  { icon: Smartphone, color: 'sky', title: 'Sign up in the app', text: 'Home owners with solar panels register in the mobile app with their NIC number.' },
  { icon: UserCheck, color: 'pink', title: 'Backoffice activates', text: 'Staff check the details and switch the account on.' },
  { icon: CalendarClock, color: 'amber', title: 'Book a slot', text: 'Pick a station and a time up to 7 days ahead. Changes are possible until 12 hours before.' },
  { icon: QrCode, color: 'emerald', title: 'Scan and trade', text: 'At the station the operator scans the booking QR code and records the energy.' },
]

// Public start page.
export default function HomePage() {
  useDocumentTitle(null)
  const stats = useApi(getPublicSummary, [])
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  // Scrolls to the "how it works" section (hash links are used by the router).
  // Source: WEB-27 (scrollIntoView).
  function showHowItWorks() {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-24 px-4 pt-12 pb-8 sm:px-6 lg:pt-20">
      <Hero onShowHow={showHowItWorks} />
      <LiveNumbers stats={stats} />
      <HowItWorks />
      <RoleCards />
      <FinalCall />
    </div>
  )
}

// Big headline, short explanation and a clay illustration.
function Hero({ onShowHow }) {
  return (
    <section className="grid items-center gap-12 lg:grid-cols-2">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 font-heading text-xs font-extrabold tracking-widest text-accent uppercase shadow-clay-row">
          <Sun aria-hidden="true" className="size-4" />
          Community solar microgrid · Sri Lanka
        </p>
        <h1 className="mt-6 font-heading text-5xl leading-[1.05] font-black tracking-tight text-ink sm:text-6xl lg:text-7xl">
          Trade sunshine <span className="clay-text-gradient">with your neighbours.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed font-medium text-muted">
          Home owners with solar panels book time at shared battery stations to store their spare energy or take it back
          when they need it. Staff approve the bookings, look after the stations and check people in with a signed QR code.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Button to="/login" size="lg" icon={LogIn} className="w-full sm:w-auto">
            Staff login
          </Button>
          <Button variant="secondary" size="lg" icon={ArrowDown} onClick={onShowHow} className="w-full sm:w-auto">
            How it works
          </Button>
        </div>
      </div>
      <HeroArt />
    </section>
  )
}

// Abstract clay composition: a battery station with floating energy pieces.
function HeroArt() {
  return (
    <div aria-hidden="true" className="relative mx-auto aspect-square w-full max-w-md">
      <div className="absolute inset-6 rounded-hero bg-linear-to-br from-violet-400 via-accent to-pink-500 shadow-clay-deep" />
      <div className="absolute inset-16 flex flex-col items-center justify-center gap-4 rounded-panel bg-white/85 shadow-clay-card backdrop-blur-xl">
        <span className="flex size-24 items-center justify-center rounded-full bg-linear-to-br from-emerald-400 to-emerald-600 text-white shadow-clay-button">
          <BatteryCharging className="size-12" />
        </span>
        <p className="font-heading text-2xl font-black text-ink">Shared battery</p>
        <p className="font-heading text-sm font-extrabold tracking-widest text-muted uppercase">Microgrid station</p>
      </div>
      <span className="absolute top-0 right-6 flex size-20 animate-clay-float items-center justify-center rounded-tile bg-linear-to-br from-amber-300 to-amber-500 text-white shadow-clay-button">
        <Sun className="size-10" />
      </span>
      <span className="absolute bottom-10 -left-2 flex size-16 animate-clay-float-delayed items-center justify-center rounded-2xl bg-linear-to-br from-sky-400 to-sky-600 text-white shadow-clay-button animation-delay-2000">
        <House className="size-8" />
      </span>
      <span className="absolute -right-2 bottom-4 animate-clay-float-slow rounded-full bg-white px-5 py-3 font-heading text-lg font-black text-sky-700 shadow-clay-card">
        Export ↑
      </span>
      <span className="absolute top-1/2 -right-6 animate-clay-float-delayed rounded-full bg-white px-5 py-3 font-heading text-lg font-black text-violet-700 shadow-clay-card">
        Import ↓
      </span>
      <span className="absolute top-12 -left-4 flex size-14 animate-clay-float items-center justify-center rounded-2xl bg-linear-to-br from-pink-400 to-pink-600 text-white shadow-clay-button animation-delay-4000">
        <QrCode className="size-7" />
      </span>
    </div>
  )
}

// Live totals from the API.
function LiveNumbers({ stats }) {
  const data = stats.data
  const waiting = stats.loading && !data
  const orbs = [
    { label: 'Active stations', value: data?.activeStations, color: 'violet', hint: 'Battery stations open for booking' },
    { label: 'Active prosumers', value: data?.activeProsumers, color: 'emerald', hint: 'Homes trading with the grid' },
    { label: 'Transfers done', value: data?.completedTransfers, color: 'sky', hint: 'Completed at the stations' },
    { label: 'Energy traded', value: data ? formatNumber(Math.round(data.totalEnergyTradedKwh)) : undefined, color: 'amber', hint: 'kWh in total' },
  ]

  return (
    <section aria-labelledby="live-numbers">
      <div className="mb-8 text-center">
        <h2 id="live-numbers" className="font-heading text-3xl font-black tracking-tight text-ink sm:text-4xl">
          Live from the grid
        </h2>
        <p className="mt-2 font-medium text-muted">Counted from the database each time this page opens.</p>
      </div>
      {stats.error ? (
        <Alert tone="warning" title="Live numbers are not available right now" className="mx-auto max-w-xl">
          The rest of the page still works. Staff can log in once the server is back.
        </Alert>
      ) : (
        <Card radius="panel" padding="lg">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {orbs.map((orb) => (
              <StatOrb key={orb.label} {...orb} loading={waiting} />
            ))}
          </div>
        </Card>
      )}
    </section>
  )
}

// Four numbered steps from sign-up to energy transfer.
function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-32">
      <div className="mb-10 text-center">
        <h2 id="how-title" className="font-heading text-3xl font-black tracking-tight text-ink sm:text-4xl">
          How it works
        </h2>
        <p className="mt-2 font-medium text-muted">Four steps from sign-up to sharing sunshine.</p>
      </div>
      <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <li key={step.title} className="group">
            <Card as="div" interactive className="h-full">
              <div className="flex items-center justify-between">
                <IconOrb icon={step.icon} color={step.color} className="transition-transform duration-300 group-hover:scale-110" />
                <span className="font-heading text-5xl font-black text-accent/20" aria-hidden="true">
                  {index + 1}
                </span>
              </div>
              <h3 className="mt-6 font-heading text-xl font-extrabold text-ink">{step.title}</h3>
              <p className="mt-2 leading-relaxed font-medium text-muted">{step.text}</p>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  )
}

// What Backoffice staff, Grid Operators and prosumers can do.
function RoleCards() {
  return (
    <section aria-labelledby="roles-title">
      <div className="mb-10 text-center">
        <h2 id="roles-title" className="font-heading text-3xl font-black tracking-tight text-ink sm:text-4xl">
          One system, three kinds of users
        </h2>
        <p className="mt-2 font-medium text-muted">Staff use this web portal; prosumers use the Android app.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card as="article" interactive padding="lg" radius="panel" className="md:col-span-2 md:row-span-2 hover:scale-[1.01]">
          <IconOrb icon={ShieldCheck} color="violet" size="lg" />
          <h3 className="mt-6 font-heading text-3xl font-black text-ink">Backoffice</h3>
          <p className="mt-2 text-lg font-medium text-muted">Runs the whole microgrid from one place.</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              'Create staff and prosumer accounts',
              'Activate new mobile sign-ups',
              'Add stations, schedules and slots',
              'Approve, reject or cancel bookings',
              'Watch live numbers on the dashboard',
              'Deactivate accounts and stations safely',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 font-medium text-ink">
                <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Button to="/login" icon={LogIn}>
              Log in to the portal
            </Button>
          </div>
        </Card>

        <Card as="article" interactive>
          <IconOrb icon={Gauge} color="sky" />
          <h3 className="mt-5 font-heading text-2xl font-extrabold text-ink">Grid Operator</h3>
          <p className="mt-2 font-medium text-muted">
            Keeps the stations running: battery bays, time slots, approvals and QR check-in at the station.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-accent">
            <ScanLine aria-hidden="true" className="size-4" /> Camera or USB scanner
          </p>
        </Card>

        <Card as="article" interactive>
          <IconOrb icon={Smartphone} color="emerald" />
          <h3 className="mt-5 font-heading text-2xl font-extrabold text-ink">Prosumer</h3>
          <p className="mt-2 font-medium text-muted">
            Uses the Android app to find nearby stations, book a slot, change it in time and show the QR code.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-accent">
            <MapPin aria-hidden="true" className="size-4" /> Stations on the map
          </p>
        </Card>
      </div>
    </section>
  )
}

// Closing banner that leads staff to the login page.
function FinalCall() {
  return (
    <section className="relative overflow-hidden rounded-hero bg-linear-to-br from-violet-500 via-accent to-pink-500 px-8 py-14 text-center text-white shadow-clay-deep sm:px-16">
      <div aria-hidden="true" className="absolute -top-16 -left-10 size-56 animate-clay-float-slow rounded-full bg-white/10" />
      <div aria-hidden="true" className="absolute -right-10 -bottom-20 size-64 animate-clay-float-delayed rounded-full bg-amber-300/20" />
      <div className="relative z-10">
        <h2 className="font-heading text-3xl font-black tracking-tight sm:text-4xl">Ready for today&apos;s shift?</h2>
        <p className="mx-auto mt-3 max-w-xl text-lg font-medium text-white/90">
          Log in to approve bookings, update battery bays and check prosumers in.
        </p>
        <div className="mt-8 flex justify-center">
          <Button to="/login" variant="secondary" size="lg" icon={LogIn}>
            Staff login
          </Button>
        </div>
      </div>
    </section>
  )
}
