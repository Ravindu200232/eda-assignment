/*
 * File:    AppLayout.jsx
 * Module:  Core layout
 * Owner:   Ravindu
 * Purpose: Frame for all signed-in pages: side menu (a drawer on phones),
 *          top bar, a thin loading bar while a page loads, and the page itself.
 */
import { useRef, useState } from 'react'
import { Outlet, useNavigation } from 'react-router'
import BackgroundBlobs from '../components/ui/BackgroundBlobs'
import Drawer from '../components/ui/Drawer'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

// Signed-in page frame.
export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const mainRef = useRef(null)
  const navigation = useNavigation()
  const badges = {}

  return (
    <div className="min-h-dvh">
      <button
        type="button"
        onClick={() => mainRef.current?.focus()}
        className="sr-only z-50 rounded-control bg-white px-5 py-3 font-heading font-bold text-accent shadow-clay-card focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Skip to content
      </button>
      <BackgroundBlobs />
      {navigation.state === 'loading' && (
        <div role="progressbar" aria-label="Loading page" className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-linear-to-r from-accent-light via-accent to-accent-alt" />
        </div>
      )}

      <div className="mx-auto flex max-w-[1600px] gap-6 p-3 sm:p-4 lg:p-6">
        <aside className="no-print sticky top-6 hidden h-[calc(100dvh-3rem)] w-72 shrink-0 lg:block">
          <Sidebar badges={badges} />
        </aside>

        <div className="min-w-0 flex-1">
          <TopBar onOpenMenu={() => setMenuOpen(true)} />
          <main ref={mainRef} id="main-content" tabIndex={-1} className="px-1 pt-8 pb-16 outline-none sm:px-2">
            <Outlet />
          </main>
        </div>
      </div>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} label="Main menu">
        <Sidebar badges={badges} onNavigate={() => setMenuOpen(false)} />
      </Drawer>
    </div>
  )
}
