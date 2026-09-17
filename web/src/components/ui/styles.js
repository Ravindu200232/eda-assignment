/*
 * File:    styles.js
 * Module:  Core UI (design system)
 * Owner:   Ravindu
 * Purpose: Class lists shared by several clay components, so buttons, links
 *          and form controls always look the same.
 * Source:  WEB-01 (claymorphism button, recessed input and icon orb gradients).
 */
import { cn } from '../../utils/cn'

// Gradient pairs for icon tiles and stat orbs (light 400 to strong 600).
export const ORB_COLORS = {
  violet: 'from-violet-400 to-violet-600',
  pink: 'from-pink-400 to-pink-600',
  sky: 'from-sky-400 to-sky-600',
  emerald: 'from-emerald-400 to-emerald-600',
  amber: 'from-amber-400 to-amber-600',
  blue: 'from-blue-400 to-blue-600',
}

const BUTTON_BASE =
  'inline-flex shrink-0 select-none items-center justify-center rounded-control font-heading font-bold tracking-wide ' +
  'transition-all duration-200 hover:-translate-y-1 active:translate-y-0 active:scale-[0.92] active:shadow-clay-pressed ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60'

const BUTTON_VARIANTS = {
  primary: 'bg-linear-to-br from-accent-light to-accent text-white shadow-clay-button hover:shadow-clay-button-hover',
  secondary: 'bg-white text-ink shadow-clay-button hover:shadow-clay-button-hover',
  outline: 'border-2 border-accent/20 bg-transparent text-accent hover:border-accent hover:bg-accent/5',
  ghost: 'bg-transparent text-ink hover:bg-accent/10 hover:text-accent',
  danger: 'bg-linear-to-br from-pink-400 to-accent-alt text-white shadow-clay-button-pink',
}

const BUTTON_SIZES = {
  sm: 'h-11 gap-2 px-4 text-sm [&_svg]:size-4',
  md: 'h-14 gap-2.5 px-6 text-base [&_svg]:size-5',
  lg: 'h-16 gap-3 px-8 text-lg [&_svg]:size-6',
}

const CONTROL_SIZES = {
  sm: 'h-11 px-4 text-sm shadow-clay-pressed-sm',
  md: 'h-14 px-5 text-base shadow-clay-pressed',
  lg: 'h-16 px-6 text-lg shadow-clay-pressed',
}

// Classes for a clay button or a link that looks like one.
export function buttonClasses({ variant = 'primary', size = 'md', fullWidth = false, className } = {}) {
  return cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], fullWidth && 'w-full', className)
}

// Classes for recessed inputs and selects. They rise to a white surface on focus.
export function controlClasses({ size = 'md', className } = {}) {
  return cn(
    'w-full min-w-0 rounded-control border-0 bg-well text-ink placeholder:text-muted transition-all duration-200',
    'focus:bg-white focus:shadow-clay-card focus:outline-none focus:ring-4 focus:ring-accent/20',
    'disabled:cursor-not-allowed disabled:opacity-60',
    'aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-danger/25',
    CONTROL_SIZES[size],
    className,
  )
}
