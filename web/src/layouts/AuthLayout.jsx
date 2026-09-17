/*
 * File:    AuthLayout.jsx
 * Module:  Core layout
 * Owner:   Ravindu
 * Purpose: Two-part login screen: a colourful panel that explains the portal
 *          next to the login card.
 * Source:  WEB-01 (split layout with an abstract clay composition).
 */
import { BatteryCharging, CalendarClock, ScanLine, Sun } from 'lucide-react'
import { Outlet } from 'react-router'
import IconOrb from '../components/ui/IconOrb'

const HIGHLIGHTS = [
  { icon: CalendarClock, color: 'sky', text: 'Approve energy bookings up to 7 days ahead' },
  { icon: BatteryCharging, color: 'emerald', text: 'Keep station batteries and slots up to date' },
  { icon: ScanLine, color: 'pink', text: 'Check prosumers in with a signed QR code' },
]

// Login frame.
export default function AuthLayout() {
  return (
    <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:pt-16">
      <section className="relative hidden overflow-hidden rounded-hero bg-linear-to-br from-violet-500 via-accent to-pink-500 p-12 text-white shadow-clay-deep lg:block">
        <div aria-hidden="true" className="absolute -top-10 -right-10 size-48 animate-clay-float-slow rounded-full bg-white/15 shadow-clay-button" />
        <div aria-hidden="true" className="absolute -right-12 -bottom-16 size-40 animate-clay-float-delayed rounded-full bg-amber-300/30" />
        <div aria-hidden="true" className="absolute top-8 right-8 flex size-20 animate-clay-float items-center justify-center rounded-tile bg-amber-300 text-white shadow-clay-button">
          <Sun className="size-10" />
        </div>

        <div className="relative z-10 pt-16">
          <p className="font-heading text-sm font-extrabold tracking-widest text-white/85 uppercase">Staff portal</p>
          <h2 className="mt-4 max-w-sm font-heading text-5xl leading-[1.1] font-black tracking-tight">
            Share the sun. Balance the grid.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed font-medium text-white/90">
            Backoffice and Grid Operator teams run the microgrid from here: stations, battery slots, bookings and check-ins.
          </p>
          <ul className="mt-10 flex flex-col gap-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item.text} className="flex items-center gap-4 rounded-tile bg-white/15 p-3 backdrop-blur-sm">
                <IconOrb icon={item.icon} color={item.color} size="sm" />
                <span className="font-semibold">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Outlet />
    </div>
  )
}
