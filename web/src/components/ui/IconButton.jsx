/*
 * File:    IconButton.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Square button that shows only an icon. The label is read out by
 *          screen readers and shown as a tooltip.
 */
import { cn } from '../../utils/cn'

const VARIANTS = {
  ghost: 'bg-transparent text-ink hover:bg-accent/10 hover:text-accent',
  secondary: 'bg-white text-ink shadow-clay-button hover:shadow-clay-button-hover',
  danger: 'bg-transparent text-accent-alt hover:bg-accent-alt/10',
}

const SIZES = {
  sm: 'size-11 [&_svg]:size-5',
  md: 'size-12 [&_svg]:size-5',
}

// Icon-only button. `label` is required for accessibility.
export default function IconButton({ icon: Icon, label, variant = 'ghost', size = 'sm', className, type = 'button', ...rest }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-2xl transition-all duration-200',
        'hover:-translate-y-0.5 active:scale-[0.92] active:shadow-clay-pressed-sm',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30 disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      <Icon aria-hidden="true" />
    </button>
  )
}
