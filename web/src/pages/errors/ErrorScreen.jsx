/*
 * File:    ErrorScreen.jsx
 * Module:  Core pages
 * Owner:   Ravindu
 * Purpose: Shared look for the 404, 403 and unexpected error screens.
 */
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import BackgroundBlobs from '../../components/ui/BackgroundBlobs'
import Button from '../../components/ui/Button'
import IconOrb from '../../components/ui/IconOrb'
import { cn } from '../../utils/cn'

// Big status code, message and one or two actions.
export default function ErrorScreen({ code, icon, color, title, message, actionLabel, actionTo, onAction, secondary, fullScreen = false }) {
  useDocumentTitle(title)

  return (
    <div className={cn('flex items-center justify-center px-4', fullScreen ? 'min-h-dvh py-10' : 'py-12')}>
      {fullScreen && <BackgroundBlobs />}
      <div className="relative w-full max-w-xl overflow-hidden rounded-card bg-white/80 p-8 text-center shadow-clay-deep backdrop-blur-xl sm:rounded-panel sm:p-12">
        <IconOrb icon={icon} color={color} size="lg" className="mx-auto animate-clay-float" />
        <p className="clay-text-gradient mt-6 font-heading text-7xl font-black tracking-tight">{code}</p>
        <h1 className="mt-2 font-heading text-3xl font-black tracking-tight text-ink">{title}</h1>
        <p className="mx-auto mt-3 max-w-md leading-relaxed font-medium text-muted">{message}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {actionTo ? (
            <Button to={actionTo}>{actionLabel}</Button>
          ) : (
            <Button onClick={onAction}>{actionLabel}</Button>
          )}
          {secondary}
        </div>
      </div>
    </div>
  )
}
