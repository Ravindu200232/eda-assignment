/*
 * File:    ConfirmDialog.jsx
 * Module:  Core UI
 * Owner:   Ravindu
 * Purpose: "Are you sure?" dialog for actions such as deactivate, reject or
 *          cancel. It can also ask for a reason and shows API errors inline.
 */
import { useState } from 'react'
import Alert from './Alert'
import Button from './Button'
import Field from './Field'
import Modal from './Modal'
import Textarea from './Textarea'

// Confirmation dialog. `onConfirm` receives the typed reason (or '').
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Go back',
  tone = 'primary',
  reasonLabel,
  reasonRequired = false,
  reasonHint,
  busy = false,
  error,
  onConfirm,
  onClose,
}) {
  return (
    <Modal open={open} onClose={busy ? undefined : onClose} title={title} size="sm" dismissible={!busy}>
      <ConfirmBody
        message={message}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        tone={tone}
        reasonLabel={reasonLabel}
        reasonRequired={reasonRequired}
        reasonHint={reasonHint}
        busy={busy}
        error={error}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    </Modal>
  )
}

// Dialog content. Lives inside the modal so the reason resets on every open.
function ConfirmBody({ message, confirmLabel, cancelLabel, tone, reasonLabel, reasonRequired, reasonHint, busy, error, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  const missingReason = reasonRequired && reason.trim().length === 0

  // Sends the confirmation with the trimmed reason.
  function handleSubmit(event) {
    event.preventDefault()
    if (!missingReason) onConfirm(reason.trim())
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {message && <div className="leading-relaxed font-medium text-muted">{message}</div>}
      {reasonLabel && (
        <Field label={reasonLabel} hint={reasonHint} required={reasonRequired}>
          <Textarea value={reason} maxLength={200} onChange={(event) => setReason(event.target.value)} />
        </Field>
      )}
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button type="submit" variant={tone} loading={busy} disabled={missingReason}>
          {confirmLabel}
        </Button>
      </div>
    </form>
  )
}
