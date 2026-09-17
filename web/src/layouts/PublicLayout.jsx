/*
 * File:    PublicLayout.jsx
 * Module:  Core layout
 * Owner:   Ravindu
 * Purpose: Frame for pages anyone can open (home and login): a floating
 *          navigation pill, the page and a short footer.
 */
import { LogIn } from 'lucide-react'
import { Outlet, useLocation } from 'react-router'
import BackgroundBlobs from '../components/ui/BackgroundBlobs'
import Brand from '../components/ui/Brand'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { homePathFor } from '../routes/navigation'

// Public page frame.
export default function PublicLayout() {
  const { user } = useAuth()
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-dvh flex-col">
      <BackgroundBlobs />
      <header className="sticky top-3 z-30 px-3 sm:top-5 sm:px-6">
        <nav
          aria-label="Site"
          className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 rounded-card bg-white/70 px-4 shadow-clay-card backdrop-blur-xl sm:h-20 sm:rounded-[40px] sm:px-8"
        >
          <Brand />
          {user ? (
            <Button to={homePathFor(user.role)} size="sm">
              Open portal
            </Button>
          ) : (
            pathname !== '/login' && (
              <Button to="/login" size="sm" icon={LogIn}>
                Staff login
              </Button>
            )
          )}
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="px-6 pt-10 pb-8 text-center text-sm font-medium text-muted">
        Smart Solar Microgrid Trading System · SE4040 Enterprise Application Development · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
