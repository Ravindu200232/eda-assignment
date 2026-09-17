/*
 * File:    ChoiceCard.jsx
 * Module:  Energy Reservations
 * Owner:   Hamnad
 * Purpose: A clay card that works as a radio button, used by the booking
 *          wizard for prosumers, stations, days, slots and the trade type.
 *          It is a real radio input, so arrow keys and screen readers work.
 */
import { useId } from 'react'
import { cn } from '../../utils/cn'

// One choice. `label` is the short name; `children` add details under it.
export default function ChoiceCard({ name, value, checked, onChange, disabled = false, label, children, className }) {
  const labelId = useId()
  const detailsId = useId()

  return (
    <label
      className={cn(
        'relative flex cursor-pointer flex-col gap-1 rounded-tile px-4 py-3 text-left transition-all duration-200',
        'has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-accent/30',
        checked
          ? 'bg-linear-to-br from-accent-light to-accent text-white shadow-clay-button'
          : 'bg-white/80 text-ink shadow-clay-row hover:-translate-y-0.5 hover:bg-white',
        disabled && 'cursor-not-allowed opacity-50 hover:translate-y-0',
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        aria-labelledby={labelId}
        aria-describedby={children ? detailsId : undefined}
        onChange={() => onChange(value)}
        // Invisible but covering the whole card, so a click anywhere on the card picks it.
        className="absolute inset-0 z-10 size-full cursor-pointer appearance-none rounded-tile opacity-0 disabled:cursor-not-allowed"
      />
      <span id={labelId} className="font-heading font-extrabold">
        {label}
      </span>
      {children && (
        <span id={detailsId} className={cn('text-sm font-medium', checked ? 'text-white/85' : 'text-muted')}>
          {children}
        </span>
      )}
    </label>
  )
}
