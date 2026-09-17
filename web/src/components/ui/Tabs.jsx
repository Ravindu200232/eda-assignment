/*
 * File:    Tabs.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Segmented pill used to switch lists (for example status filters).
 *          Arrow keys, Home and End move between tabs.
 * Source:  WEB-19 (WAI-ARIA tabs pattern).
 */
import { useRef } from 'react'
import { cn } from '../../utils/cn'

const KEY_MOVES = {
  ArrowRight: (index, last) => (index === last ? 0 : index + 1),
  ArrowLeft: (index, last) => (index === 0 ? last : index - 1),
  Home: () => 0,
  End: (index, last) => last,
}

// Tab list. `tabs` is [{ value, label, count? }].
export default function Tabs({ tabs, value, onChange, label, className }) {
  const buttons = useRef([])
  const selectedIndex = Math.max(
    tabs.findIndex((tab) => tab.value === value),
    0,
  )

  // Moves focus and selection with the keyboard.
  function handleKeyDown(event, index) {
    const move = KEY_MOVES[event.key]
    if (!move) return

    event.preventDefault()
    const next = move(index, tabs.length - 1)
    buttons.current[next]?.focus()
    onChange(tabs[next].value)
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('inline-flex max-w-full gap-1 overflow-x-auto rounded-tile bg-well p-1.5 shadow-clay-pressed-sm', className)}
    >
      {tabs.map((tab, index) => {
        const selected = index === selectedIndex
        return (
          <button
            key={tab.value}
            ref={(element) => {
              buttons.current[index] = element
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'inline-flex h-11 shrink-0 items-center gap-2 rounded-control px-4 font-heading text-sm font-bold whitespace-nowrap',
              'transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30',
              selected ? 'bg-white text-accent shadow-clay-card' : 'text-muted hover:bg-white/50 hover:text-ink',
            )}
          >
            {tab.label}
            {tab.count != null && ' '}
            {tab.count != null && (
              <span
                className={cn(
                  'min-w-6 rounded-full px-2 py-0.5 text-xs font-black',
                  selected ? 'bg-accent text-white' : 'bg-white text-ink',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
