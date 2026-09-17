/*
 * File:    TopBar.jsx
 * Module:  Core layout
 * Owner:   Ravindu
 * Purpose: Floating bar above every signed-in page: menu button on phones,
 *          a greeting, the API status light and the user menu.
 */
import { Menu } from 'lucide-react'
import Brand from '../components/ui/Brand'
import IconButton from '../components/ui/IconButton'
import { useAuth } from '../context/AuthContext'
import { homePathFor } from '../routes/navigation'
import { TIME_ZONE, formatDate } from '../utils/format'
import ApiStatus from './ApiStatus'
import UserMenu from './UserMenu'

// Morning, afternoon or evening in Sri Lanka time.
function greeting(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', hourCycle: 'h23' }).format(now))
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// Top bar. `onOpenMenu` opens the phone menu drawer.
export default function TopBar({ onOpenMenu }) {
  const { user } = useAuth()
  const firstName = user.fullName.split(' ')[0]

  return (
    <header className="no-print sticky top-3 z-30 flex h-16 items-center gap-2 rounded-card bg-white/70 px-2 shadow-clay-card backdrop-blur-xl sm:h-20 sm:gap-3 sm:rounded-[40px] sm:px-5 lg:top-6">
      <IconButton icon={Menu} label="Open menu" onClick={onOpenMenu} className="lg:hidden" />
      <Brand to={homePathFor(user.role)} compact className="lg:hidden" />
      <div className="hidden min-w-0 lg:block">
        <p className="truncate font-heading text-lg font-extrabold text-ink">
          {greeting()}, {firstName}
        </p>
        <p className="text-sm font-medium text-muted">{formatDate(new Date())}</p>
      </div>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="hidden sm:block">
          <ApiStatus />
        </div>
        <UserMenu />
      </div>
    </header>
  )
}
