/*
 * File:    Sidebar.jsx
 * Module:  Core layout
 * Owner:   Ravindu
 * Purpose: Main menu for signed-in staff. Only the entries the user's role
 *          may open are listed, grouped into sections.
 */
import { LogOut } from 'lucide-react'
import { NavLink } from 'react-router'
import Brand from '../components/ui/Brand'
import StatusBadge from '../components/ui/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { groupBySection, homePathFor, navItemsFor } from '../routes/navigation'
import { cn } from '../utils/cn'
import { initials } from '../utils/format'

// Full menu panel. `badges` maps a path to a small count, e.g. { '/activations': 2 }.
export default function Sidebar({ badges = {}, onNavigate }) {
  const { user, logout } = useAuth()
  const sections = groupBySection(navItemsFor(user.role))

  return (
    <div className="flex h-full flex-col rounded-panel bg-white/75 p-5 shadow-clay-card backdrop-blur-xl">
      <Brand to={homePathFor(user.role)} className="px-2 pt-1 pb-6" />

      <nav aria-label="Main menu" className="-mx-1 flex-1 overflow-y-auto px-1 pb-4">
        {sections.map((section) => (
          <div key={section.name} className="mb-6 last:mb-0">
            <p className="px-3 pb-2 font-heading text-xs font-extrabold tracking-widest text-muted uppercase">{section.name}</p>
            <ul className="flex flex-col gap-1.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <MenuLink to={item.to} icon={item.icon} label={item.label} badge={badges[item.to]} onClick={onNavigate} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="rounded-tile bg-well p-3 shadow-clay-pressed-sm">
        <NavLink
          to="/account"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-control p-1.5 transition-colors hover:bg-white/60"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-400 to-violet-600 font-heading font-black text-white shadow-clay-button">
            {initials(user.fullName)}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-heading font-extrabold text-ink">{user.fullName}</span>
            <StatusBadge status={user.role} className="mt-1" />
          </span>
        </NavLink>
        <button
          type="button"
          onClick={logout}
          className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-control font-heading text-sm font-bold text-accent-alt transition-all hover:bg-white active:scale-[0.96]"
        >
          <LogOut aria-hidden="true" className="size-4" />
          Log out
        </button>
      </div>
    </div>
  )
}

// One menu entry. The current page is highlighted with the primary gradient.
function MenuLink({ to, icon: Icon, label, badge, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex h-12 items-center gap-3 rounded-control px-4 font-heading font-bold transition-all duration-200',
          isActive
            ? 'bg-linear-to-br from-accent-light to-accent text-white shadow-clay-button'
            : 'text-ink hover:-translate-y-0.5 hover:bg-white hover:text-accent hover:shadow-clay-row',
        )
      }
    >
      <Icon aria-hidden="true" className="size-5 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge > 0 && (
        <span className="min-w-6 rounded-full bg-accent-alt px-2 py-0.5 text-center text-xs font-black text-white">
          {badge}
          <span className="sr-only"> waiting</span>
        </span>
      )}
    </NavLink>
  )
}
