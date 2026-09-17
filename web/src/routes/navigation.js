/*
 * File:    navigation.js
 * Module:  Core (navigation)
 * Owner:   Ravindu
 * Purpose: The side menu entries and which roles see them. The first entry a
 *          role can open is where that role lands after logging in.
 *          Each team member adds the entries for their own pages here.
 */
import { Gauge, LayoutDashboard, ScanLine, UserCheck, UserCog, UsersRound } from 'lucide-react'
import { BACKOFFICE_ONLY, Roles, STAFF_ROLES } from '../utils/roles'

// Menu order matters: sections appear in the order of their first entry.
export const NAV_ITEMS = [
  // Added by Malith: each role's home page comes first
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Overview', roles: BACKOFFICE_ONLY },
  { to: '/operations', label: 'Operations', icon: Gauge, section: 'Overview', roles: [Roles.GridOperator] },
  // Added by Ravindu
  { to: '/check-in', label: 'QR check-in', icon: ScanLine, section: 'Daily work', roles: STAFF_ROLES },
  // Added by Malith
  { to: '/prosumers', label: 'Prosumers', icon: UsersRound, section: 'People', roles: STAFF_ROLES },
  { to: '/activations', label: 'Pending activations', icon: UserCheck, section: 'People', roles: BACKOFFICE_ONLY },
  // Added by Ravindu
  { to: '/users', label: 'Staff users', icon: UserCog, section: 'People', roles: BACKOFFICE_ONLY },
]

// Menu entries the role may open, in menu order.
export function navItemsFor(role, items = NAV_ITEMS) {
  return items.filter((item) => item.roles.includes(role))
}

// Groups entries by section for the side menu.
export function groupBySection(items) {
  const sections = []
  for (const item of items) {
    let section = sections.find((entry) => entry.name === item.section)
    if (!section) {
      section = { name: item.section, items: [] }
      sections.push(section)
    }
    section.items.push(item)
  }
  return sections
}

// The page a role sees right after logging in.
export function homePathFor(role, items = NAV_ITEMS) {
  return navItemsFor(role, items)[0]?.to ?? '/account'
}

// Where to go after login: the page the user asked for, if it is a safe
// in-app path their role may open, otherwise their home page.
export function pathAfterLogin(requestedPath, role, items = NAV_ITEMS) {
  const isAppPath =
    typeof requestedPath === 'string' &&
    requestedPath.startsWith('/') &&
    !requestedPath.startsWith('//') &&
    !requestedPath.startsWith('/login')

  if (!isAppPath || requestedPath === '/') return homePathFor(role, items)

  const blocked = items.some(
    (item) => (requestedPath === item.to || requestedPath.startsWith(`${item.to}/`)) && !item.roles.includes(role),
  )
  return blocked ? homePathFor(role, items) : requestedPath
}
