/*
 * File:    Field.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Form row with a label, the control, an optional hint and the error
 *          message returned by the API for that field.
 * Source:  WEB-06 (React useId).
 */
import { useId, useMemo } from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from '../../utils/cn'
import { FieldContext } from './fieldContext'

// Wraps one control. The control reads its id and aria links from context.
export default function Field({ label, hint, error, required = false, className, children }) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined

  const context = useMemo(
    () => ({
      id,
      required,
      invalid: Boolean(error),
      describedBy: [errorId, hintId].filter(Boolean).join(' ') || undefined,
    }),
    [id, required, error, errorId, hintId],
  )

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label
        htmlFor={id}
        className={cn(
          'font-heading text-sm font-extrabold text-ink',
          required && "after:ml-1 after:text-accent-alt after:content-['*']",
        )}
      >
        {label}
      </label>
      <FieldContext value={context}>{children}</FieldContext>
      {error && (
        <p id={errorId} className="flex items-center gap-1.5 text-sm font-semibold text-pink-700">
          <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}
