/*
 * File:    Textarea.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Recessed multi-line text box, used for reasons and scanned QR text.
 */
import { cn } from '../../utils/cn'
import { useFieldProps } from './fieldContext'

// Multi-line input with the same look as Input.
export default function Textarea({ rows = 3, className, ...rest }) {
  const fieldProps = useFieldProps()

  return (
    <textarea
      {...fieldProps}
      rows={rows}
      className={cn(
        'w-full min-w-0 resize-y rounded-control border-0 bg-well px-5 py-4 text-base text-ink shadow-clay-pressed',
        'transition-all duration-200 placeholder:text-muted focus:bg-white focus:shadow-clay-card focus:outline-none',
        'focus:ring-4 focus:ring-accent/20 disabled:opacity-60 aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-danger/25',
        className,
      )}
      {...rest}
    />
  )
}
