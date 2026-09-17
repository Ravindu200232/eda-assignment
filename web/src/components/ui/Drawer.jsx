/*
 * File:    Drawer.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Side panel that slides in on small screens (used for the menu).
 *          Built on <dialog> so focus stays inside and Escape closes it.
 * Source:  WEB-09 (MDN dialog element).
 */
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import IconButton from './IconButton'

// Left-hand drawer controlled by `open`.
export default function Drawer({ open, onClose, label, children }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Escape key and clicks on the dimmed area close the drawer.
  function handleCancel(event) {
    event.preventDefault()
    onClose()
  }

  // A click on the dialog element itself is a click on the backdrop.
  function handleClick(event) {
    if (event.target === dialogRef.current) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      onCancel={handleCancel}
      onClick={handleClick}
      className="m-0 h-dvh max-h-dvh w-[min(20rem,calc(100%-3rem))] max-w-none overflow-visible bg-transparent p-3"
    >
      {open && (
        <div className="relative h-full animate-clay-pop">
          <div className="absolute top-4 right-4 z-20">
            <IconButton icon={X} label="Close menu" variant="secondary" onClick={onClose} />
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}
