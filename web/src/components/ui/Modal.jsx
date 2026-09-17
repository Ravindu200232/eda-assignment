/*
 * File:    Modal.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Dialog window built on the native <dialog> element, which keeps
 *          keyboard focus inside and closes with the Escape key.
 * Source:  WEB-09 (MDN dialog element).
 */
import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'
import IconButton from './IconButton'

const WIDTHS = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
}

// Opens and closes with `open`. The body is only rendered while open,
// so forms inside start fresh every time.
export default function Modal({ open, onClose, title, description, footer, size = 'md', dismissible = true, children }) {
  const dialogRef = useRef(null)
  const pressedOnBackdrop = useRef(false)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Escape key: let React state decide whether the dialog closes.
  function handleCancel(event) {
    event.preventDefault()
    if (dismissible) onClose?.()
  }

  // Remembers whether a click started on the dimmed backdrop.
  function handlePointerDown(event) {
    pressedOnBackdrop.current = event.target === dialogRef.current
  }

  // Closes only when the whole click happened on the backdrop.
  function handleClick(event) {
    if (dismissible && pressedOnBackdrop.current && event.target === dialogRef.current) onClose?.()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={handleCancel}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      className={cn('m-auto w-[calc(100%-2rem)] overflow-visible bg-transparent p-0 text-ink', WIDTHS[size])}
    >
      {open && (
        <div className="max-h-[calc(100dvh-2rem)] animate-clay-pop overflow-y-auto rounded-panel bg-white/95 p-6 shadow-clay-deep sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id={titleId} className="font-heading text-2xl font-black tracking-tight">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1.5 font-medium text-muted">
                  {description}
                </p>
              )}
            </div>
            {dismissible && <IconButton icon={X} label="Close" onClick={onClose} />}
          </div>
          {children}
          {footer && <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{footer}</div>}
        </div>
      )}
    </dialog>
  )
}
