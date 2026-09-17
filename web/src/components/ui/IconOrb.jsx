/*
 * File:    IconOrb.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Rounded gradient tile that holds an icon. Colours vary to add
 *          visual interest, as the design system asks.
 * Source:  WEB-01 (icon orbs), WEB-08 (Lucide icons).
 */
import { cn } from '../../utils/cn'
import { ORB_COLORS } from './styles'

const SIZES = {
  sm: 'size-11 rounded-2xl [&_svg]:size-5',
  md: 'size-14 rounded-2xl [&_svg]:size-7',
  lg: 'size-20 rounded-tile [&_svg]:size-10',
}

// Decorative icon tile (hidden from screen readers).
export default function IconOrb({ icon: Icon, color = 'violet', size = 'md', className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center bg-linear-to-br text-white shadow-clay-button',
        ORB_COLORS[color] ?? ORB_COLORS.violet,
        SIZES[size],
        className,
      )}
    >
      <Icon />
    </span>
  )
}
