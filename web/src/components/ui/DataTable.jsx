/*
 * File:    DataTable.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: List of records. Wide screens get a table; phones get one card per
 *          record so nothing needs sideways scrolling. Loading, error and
 *          empty states are handled here so every list behaves the same.
 */
import { RefreshCw } from 'lucide-react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { cn } from '../../utils/cn'
import Alert from './Alert'
import Button from './Button'
import { SkeletonRows } from './Skeleton'

// columns: [{ key, header, render?(row), className?, primary? }]
export default function DataTable({ columns, rows, rowKey = 'id', caption, loading = false, error, onRetry, empty }) {
  const wide = useMediaQuery('(min-width: 768px)')
  const items = rows ?? []

  if (error) {
    return (
      <Alert
        tone="danger"
        title="Could not load the list"
        action={
          onRetry && (
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>
              Try again
            </Button>
          )
        }
      >
        {error}
      </Alert>
    )
  }

  if (loading && items.length === 0) return <SkeletonRows />
  if (items.length === 0) return empty ?? null

  const keyOf = (row) => (typeof rowKey === 'function' ? rowKey(row) : row[rowKey])
  const cell = (column, row) => (column.render ? column.render(row) : (row[column.key] ?? '—'))

  if (!wide) {
    const primary = columns.find((column) => column.primary) ?? columns[0]
    const details = columns.filter((column) => column !== primary && column.header)
    const actions = columns.filter((column) => column !== primary && !column.header)
    return (
      <ul aria-label={caption} aria-busy={loading || undefined} className="flex flex-col gap-4">
        {items.map((row) => (
          <li key={keyOf(row)} className="rounded-tile bg-white/80 p-5 shadow-clay-card">
            <div className="mb-3">{cell(primary, row)}</div>
            <dl className="flex flex-col gap-2">
              {details.map((column) => (
                <div key={column.key} className="flex items-start justify-between gap-4">
                  <dt className="pt-0.5 font-heading text-xs font-extrabold tracking-wide text-muted uppercase">{column.header}</dt>
                  <dd className="min-w-0 text-right text-sm font-medium">{cell(column, row)}</dd>
                </div>
              ))}
            </dl>
            {actions.map((column) => (
              <div key={column.key} className="mt-4 flex justify-end border-t border-well pt-3">
                {cell(column, row)}
              </div>
            ))}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="-mx-2 overflow-x-auto px-2 pb-2">
      <table aria-busy={loading || undefined} className="w-full border-separate border-spacing-y-3 text-left">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn('px-4 font-heading text-xs font-extrabold tracking-widest whitespace-nowrap text-muted uppercase', column.className)}
              >
                {column.header || <span className="sr-only">Actions</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={keyOf(row)} className="group">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'bg-white/80 px-4 py-4 align-middle text-sm font-medium shadow-clay-row transition-colors duration-200',
                    'group-hover:bg-white first:rounded-l-control last:rounded-r-control',
                    column.className,
                  )}
                >
                  {cell(column, row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
