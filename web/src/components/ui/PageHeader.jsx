/*
 * File:    PageHeader.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: Title block at the top of every signed-in page. It also sets the
 *          browser tab title.
 */
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

// Page title, short description, optional back link and action buttons.
export default function PageHeader({ title, description, eyebrow, backTo, backLabel = 'Back', actions, documentTitle }) {
  useDocumentTitle(documentTitle ?? title)

  return (
    <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {backTo && (
          <Link
            to={backTo}
            className="mb-3 inline-flex items-center gap-1.5 rounded-full font-heading text-sm font-bold text-accent hover:underline"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {backLabel}
          </Link>
        )}
        {eyebrow && (
          <p className="mb-1 font-heading text-xs font-extrabold tracking-widest text-accent uppercase">{eyebrow}</p>
        )}
        <h1 className="font-heading text-3xl leading-tight font-black tracking-tight text-ink sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-base leading-relaxed font-medium text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-end">{actions}</div>}
    </header>
  )
}
