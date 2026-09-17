/*
 * File:    LiveStatus.jsx
 * Module:  Dashboards
 * Owner:   Malith
 * Purpose: "Updated at" time and a refresh button for the live dashboards.
 */
import { RefreshCw } from 'lucide-react'
import Button from '../../components/ui/Button'
import { cn } from '../../utils/cn'
import { formatTime } from '../../utils/format'

// Shows when the numbers were calculated and lets the user refresh them.
export default function LiveStatus({ generatedAt, loading, onRefresh }) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-sm font-medium text-muted" aria-live="polite">
        {generatedAt ? `Updated ${formatTime(generatedAt)}` : 'Loading…'}
      </p>
      <Button
        variant="secondary"
        size="sm"
        icon={RefreshCw}
        onClick={onRefresh}
        disabled={loading}
        className={cn(loading && '[&_svg]:animate-spin')}
      >
        Refresh
      </Button>
    </div>
  )
}
