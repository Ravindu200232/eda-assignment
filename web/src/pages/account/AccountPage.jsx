/*
 * File:    AccountPage.jsx
 * Module:  Authentication
 * Owner:   Ravindu
 * Purpose: Shows the signed-in staff member's details and lets them change
 *          their password.
 */
import { useState } from 'react'
import { IdCard, KeyRound, LogOut, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react'
import { changePassword } from '../../api/auth'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Field from '../../components/ui/Field'
import FormAlert from '../../components/ui/FormAlert'
import PageHeader from '../../components/ui/PageHeader'
import PasswordInput from '../../components/ui/PasswordInput'
import StatusBadge from '../../components/ui/StatusBadge'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { formatDateTime, initials } from '../../utils/format'
import { Roles } from '../../utils/roles'

const EMPTY_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' }

// "My account" page.
export default function AccountPage() {
  const { user, expiresAt, logout } = useAuth()

  const details = [
    { icon: IdCard, label: 'NIC', value: user.nic },
    { icon: Mail, label: 'Email', value: user.email },
    { icon: Phone, label: 'Phone', value: user.phone },
    { icon: UserRound, label: 'Member since', value: formatDateTime(user.createdAt) },
    { icon: ShieldCheck, label: 'Last login', value: formatDateTime(user.lastLoginAt) },
  ]

  return (
    <>
      <PageHeader title="My account" description="Your staff profile and password." />

      <div className="grid items-start gap-8 xl:grid-cols-2">
        <Card>
          <div className="flex flex-col items-center text-center">
            <span className="flex size-28 animate-clay-breathe items-center justify-center rounded-full bg-linear-to-br from-violet-400 to-pink-500 font-heading text-4xl font-black text-white shadow-clay-button">
              {initials(user.fullName)}
            </span>
            <h2 className="mt-5 font-heading text-2xl font-extrabold text-ink">{user.fullName}</h2>
            <div className="mt-2 flex gap-2">
              <StatusBadge status={user.role} />
              <StatusBadge status={user.status} />
            </div>
          </div>

          <dl className="mt-8 flex flex-col gap-3">
            {details.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-4 rounded-tile bg-well/70 px-4 py-3">
                <Icon aria-hidden="true" className="size-5 shrink-0 text-accent" />
                <dt className="w-28 shrink-0 font-heading text-sm font-extrabold text-muted">{label}</dt>
                <dd className="min-w-0 font-medium break-words text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 text-sm leading-relaxed font-medium text-muted">
            {user.role === Roles.Backoffice
              ? 'You can edit your name, email and phone on the Staff users page.'
              : 'Ask a Backoffice user if your name, email or phone needs to change.'}
          </p>
        </Card>

        <div className="flex flex-col gap-8">
          <Card title="Change password" description="Use at least 8 characters with letters and numbers." icon={KeyRound} iconColor="amber">
            <ChangePasswordForm />
          </Card>

          <Card title="This session" icon={LogOut} iconColor="pink" padding="md">
            <p className="font-medium text-muted">
              You are signed in until <span className="font-bold text-ink">{formatDateTime(expiresAt)}</span>. For safety, log out
              when you leave a shared computer.
            </p>
            <div className="mt-5">
              <Button variant="outline" icon={LogOut} onClick={logout}>
                Log out now
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}

// Password change form. The API checks the current password and the rules.
function ChangePasswordForm() {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  // Keeps the typed values.
  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  // Sends the change after checking that both new passwords match.
  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    if (form.newPassword !== form.confirmPassword) {
      setFieldErrors({ confirmPassword: 'The two new passwords do not match.' })
      return
    }

    setBusy(true)
    try {
      await changePassword(form.currentPassword, form.newPassword)
      setForm(EMPTY_FORM)
      toast.success('Your password was changed.')
    } catch (changeError) {
      setFieldErrors(getFieldErrors(changeError))
      setError(getErrorMessage(changeError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <FormAlert error={error} fieldErrors={fieldErrors} />
      <Field label="Current password" error={fieldErrors.currentPassword} required>
        <PasswordInput name="currentPassword" value={form.currentPassword} onChange={handleChange} autoComplete="current-password" />
      </Field>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="New password" error={fieldErrors.newPassword} required>
          <PasswordInput name="newPassword" value={form.newPassword} onChange={handleChange} autoComplete="new-password" />
        </Field>
        <Field label="Repeat new password" error={fieldErrors.confirmPassword} required>
          <PasswordInput name="confirmPassword" value={form.confirmPassword} onChange={handleChange} autoComplete="new-password" />
        </Field>
      </div>
      <div>
        <Button type="submit" icon={KeyRound} loading={busy}>
          Change password
        </Button>
      </div>
    </form>
  )
}
