/*
 * File:    Card.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Glass clay card. It can show a title row with an icon and actions,
 *          and can lift on hover when the whole card is clickable.
 * Source:  WEB-01 (claymorphism card).
 */
import { cn } from '../../utils/cn'
import IconOrb from './IconOrb'

const PADDING = {
  none: '',
  sm: 'p-4 sm:p-5',
  md: 'p-6 sm:p-8',
  lg: 'p-8 sm:p-10',
}

const TONES = {
  glass: 'bg-white/70',
  solid: 'bg-white/90',
}

const RADII = {
  card: 'rounded-card',
  panel: 'rounded-card sm:rounded-panel',
}

// Card wrapper. Content sits above absolutely positioned decorations.
export default function Card({
  as: Tag = 'section',
  title,
  description,
  icon,
  iconColor,
  actions,
  interactive = false,
  padding = 'md',
  tone = 'glass',
  radius = 'card',
  className,
  children,
  ...rest
}) {
  const hasHeader = title || actions

  return (
    <Tag
      className={cn(
        'relative overflow-hidden shadow-clay-card backdrop-blur-xl transition-all duration-500',
        RADII[radius],
        TONES[tone],
        PADDING[padding],
        interactive && 'hover:-translate-y-2 hover:shadow-clay-card-hover',
        className,
      )}
      {...rest}
    >
      <div className="relative z-10 flex h-full flex-col">
        {hasHeader && (
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              {icon && <IconOrb icon={icon} color={iconColor} size="sm" />}
              <div className="min-w-0">
                {title && <h2 className="font-heading text-xl font-extrabold text-ink sm:text-2xl">{title}</h2>}
                {description && <p className="mt-1 text-sm font-medium text-muted">{description}</p>}
              </div>
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </div>
    </Tag>
  )
}
