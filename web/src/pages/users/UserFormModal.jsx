/*
 * File:    UserFormModal.jsx
 * Module:  Staff Users
 * Owner:   Ravindu
 * Purpose: Create or edit a Backoffice / Grid Operator account. The NIC is
 *          the account key, so it cannot be changed after creation.
 */
import { useState } from 'react'
import { Save } from 'lucide-react'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import { createUser, updateUser } from '../../api/users'
import Button from '../../components/ui/Button'
import Field from '../../components/ui/Field'
import FormAlert from '../../components/ui/FormAlert'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import PasswordInput from '../../components/ui/PasswordInput'
import Select from '../../components/ui/Select'
import { Roles, STAFF_ROLE_OPTIONS } from '../../utils/roles'

const PASSWORD_HINT = 'At least 8 characters, with both letters and numbers.'

// Dialog wrapper. `user` is null for a new account.
export default function UserFormModal({ open, user, isSelf = false, onClose, onSaved }) {
  const isEdit = Boolean(user)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit staff user' : 'New staff user'}
      description={isEdit ? `NIC ${user.nic}` : 'The account can log in to this portal straight away.'}
    >
      <UserForm user={user} isSelf={isSelf} onCancel={onClose} onSaved={onSaved} />
    </Modal>
  )
}

// The form itself. It starts fresh each time the dialog opens.
function UserForm({ user, isSelf, onCancel, onSaved }) {
  const isEdit = Boolean(user)
  const [form, setForm] = useState({
    nic: user?.nic ?? '',
    fullName: user?.fullName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    role: user?.role ?? Roles.GridOperator,
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

  // Saves through the API and passes the saved account back.
  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setFieldErrors({})

    const details = { fullName: form.fullName, email: form.email, phone: form.phone, role: form.role }
    try {
      const saved = isEdit
        ? await updateUser(user.nic, { ...details, newPassword: form.password || null })
        : await createUser({ ...details, nic: form.nic, password: form.password })
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
        <Field label="Role" error={fieldErrors.role} hint={isSelf ? 'You cannot change your own role.' : undefined} required>
          <Select name="role" options={STAFF_ROLE_OPTIONS} value={form.role} onChange={handleChange} disabled={isSelf} />
        </Field>
      </div>

      <Field label="Full name" error={fieldErrors.fullName} required>
        <Input name="fullName" value={form.fullName} onChange={handleChange} autoComplete="name" />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" error={fieldErrors.email} required>
          <Input name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" />
        </Field>
        <Field label="Phone" error={fieldErrors.phone} hint="e.g. 0771234567" required>
          <Input name="phone" type="tel" value={form.phone} onChange={handleChange} autoComplete="tel" />
        </Field>
      </div>

      <Field
        label={isEdit ? 'New password (optional)' : 'Password'}
        error={fieldErrors.password ?? fieldErrors.newPassword}
        hint={isEdit ? `Leave empty to keep the current password. ${PASSWORD_HINT}` : PASSWORD_HINT}
        required={!isEdit}
      >
        <PasswordInput name="password" value={form.password} onChange={handleChange} autoComplete="new-password" />
      </Field>

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
