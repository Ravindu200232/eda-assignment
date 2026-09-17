/*
 * File:    Pagination.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Previous / next controls for paged API lists.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from './Button'

// Shows "x items · page a of b" with previous and next buttons.
export default function Pagination({ page, totalPages, total, onPageChange, itemLabel = 'records' }) {
  if (!total) return null
  const pages = Math.max(totalPages, 1)

  return (
    <nav aria-label="Pages" className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
      <p className="text-sm font-medium text-muted">
        <span className="font-heading font-extrabold text-ink">{total}</span> {itemLabel} · page {page} of {pages}
      </p>
      <div className="flex gap-3">
        <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" size="sm" iconRight={ChevronRight} disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  )
}
