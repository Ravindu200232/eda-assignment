/*
 * File:    UserMenu.jsx
 * Module:  Core layout
 * Owner:   Ravindu
 * Purpose: Avatar button in the top bar that opens a small menu with the
 *          account page and the logout action.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, LogOut, UserRound } from 'lucide-react'
import { Link } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { formatLabel, initials } from '../utils/format'

// Disclosure menu; closes on Escape or a click outside.
export default function UserMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)
  const buttonRef = useRef(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return undefined

    // Closes the menu when the user clicks elsewhere.
    const onPointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false)
    }
    // Closes the menu with Escape and returns focus to the button.
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Account menu for ${user.fullName}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="flex h-12 items-center gap-2 rounded-full bg-white/80 py-1 pr-3 pl-1 shadow-clay-row transition-all hover:-translate-y-0.5 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
      >
        <span
          aria-hidden="true"
          className="flex size-10 items-center justify-center rounded-full bg-linear-to-br from-violet-400 to-violet-600 font-heading text-sm font-black text-white"
        >
          {initials(user.fullName)}
        </span>
        <ChevronDown aria-hidden="true" className={`size-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute top-[calc(100%+0.75rem)] right-0 z-40 w-72 animate-clay-pop rounded-card bg-white/95 p-4 shadow-clay-deep backdrop-blur-xl"
        >
          <p className="truncate font-heading text-lg font-extrabold text-ink">{user.fullName}</p>
          <p className="truncate text-sm font-medium text-muted">{user.email}</p>
          <p className="mt-1 font-heading text-xs font-extrabold tracking-wide text-accent uppercase">{formatLabel(user.role)}</p>
          <div className="mt-4 flex flex-col gap-1">
            <Link
              to="/account"
              onClick={() => setOpen(false)}
              className="flex h-11 items-center gap-3 rounded-control px-3 font-heading font-bold text-ink transition-colors hover:bg-accent/10 hover:text-accent"
            >
              <UserRound aria-hidden="true" className="size-5" />
              My account
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex h-11 items-center gap-3 rounded-control px-3 text-left font-heading font-bold text-accent-alt transition-colors hover:bg-accent-alt/10"
            >
              <LogOut aria-hidden="true" className="size-5" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
