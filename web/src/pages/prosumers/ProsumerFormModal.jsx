/*
 * File:    ProsumerFormModal.jsx
 * Module:  Prosumer Accounts
 * Owner:   Malith
 * Purpose: Create a prosumer account for someone at the office, or edit a
 *          prosumer's details. The NIC is the account key and never changes.
 */
import { useState } from 'react'
import { Save } from 'lucide-react'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import { createProsumer, updateProsumer } from '../../api/prosumers'
import Button from '../../components/ui/Button'
import Field from '../../components/ui/Field'
import FormAlert from '../../components/ui/FormAlert'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import PasswordInput from '../../components/ui/PasswordInput'

// Dialog wrapper. `prosumer` is null when a new account is created.
export default function ProsumerFormModal({ open, prosumer, onClose, onSaved }) {
  const isEdit = Boolean(prosumer)

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit prosumer' : 'New prosumer'}
      description={
        isEdit
          ? `NIC ${prosumer.nic}`
          : 'Accounts created here are active at once. Sign-ups from the mobile app wait for activation instead.'
      }
    >
      <ProsumerForm prosumer={prosumer} onCancel={onClose} onSaved={onSaved} />
    </Modal>
  )
}

// Turns the optional number box into a number or null.
function optionalNumber(text) {
  return text.trim() === '' ? null : Number(text)
}

// The form. It starts fresh each time the dialog opens.
function ProsumerForm({ prosumer, onCancel, onSaved }) {
  const isEdit = Boolean(prosumer)
  const [form, setForm] = useState({
    nic: prosumer?.nic ?? '',
    fullName: prosumer?.fullName ?? '',
    email: prosumer?.email ?? '',
    phone: prosumer?.phone ?? '',
    address: prosumer?.address ?? '',
    meterNumber: prosumer?.meterNumber ?? '',
    solarCapacityKw: prosumer?.solarCapacityKw?.toString() ?? '',
    password: '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  // Keeps the typed values.
  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  // Saves through the API, which checks the NIC, email and every field.
  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setFieldErrors({})

    const details = {
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      address: form.address,
      meterNumber: form.meterNumber.trim() || null,
      solarCapacityKw: optionalNumber(form.solarCapacityKw),
    }

    try {
      const saved = isEdit
        ? await updateProsumer(prosumer.nic, details)
        : await createProsumer({ ...details, nic: form.nic, password: form.password })
      onSaved(saved, isEdit)
    } catch (saveError) {
      setFieldErrors(getFieldErrors(saveError))
      setError(getErrorMessage(saveError))
      setBusy(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <FormAlert error={error} fieldErrors={fieldErrors} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="NIC" error={fieldErrors.nic} hint={isEdit ? 'The NIC cannot be changed.' : '9 digits + V/X, or 12 digits'} required>
          <Input name="nic" value={form.nic} onChange={handleChange} readOnly={isEdit} autoComplete="off" />
        </Field>
        <Field label="Full name" error={fieldErrors.fullName} required>
          <Input name="fullName" value={form.fullName} onChange={handleChange} autoComplete="name" />
        </Field>
        <Field label="Email" error={fieldErrors.email} required>
          <Input name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" />
        </Field>
        <Field label="Phone" error={fieldErrors.phone} hint="e.g. 0771234567" required>
          <Input name="phone" type="tel" value={form.phone} onChange={handleChange} autoComplete="tel" />
        </Field>
      </div>

      <Field label="Home address" error={fieldErrors.address} required>
        <Input name="address" value={form.address} onChange={handleChange} autoComplete="street-address" />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Electricity meter number" error={fieldErrors.meterNumber} hint="Optional">
          <Input name="meterNumber" value={form.meterNumber} onChange={handleChange} autoComplete="off" />
        </Field>
        <Field label="Solar panel capacity (kW)" error={fieldErrors.solarCapacityKw} hint="Optional">
          <Input
            name="solarCapacityKw"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            value={form.solarCapacityKw}
            onChange={handleChange}
          />
        </Field>
      </div>

      {!isEdit && (
        <Field label="Password" error={fieldErrors.password} hint="At least 8 characters, with both letters and numbers." required>
          <PasswordInput name="password" value={form.password} onChange={handleChange} autoComplete="new-password" />
        </Field>
      )}

      <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" icon={Save} loading={busy}>
          {isEdit ? 'Save changes' : 'Create account'}
        </Button>
      </div>
    </form>
  )
}
