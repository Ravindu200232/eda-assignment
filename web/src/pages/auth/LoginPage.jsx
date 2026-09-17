/*
 * File:    LoginPage.jsx
 * Module:  Authentication
 * Owner:   Ravindu
 * Purpose: Staff login with NIC or email. Once the session is stored, the
 *          route guard sends Backoffice and Grid Operator users to their own
 *          home page. Prosumer accounts are refused (they use the mobile app).
 */
import { useState } from 'react'
import { ArrowRight, LockKeyhole, Smartphone, UserRound } from 'lucide-react'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Field from '../../components/ui/Field'
import FormAlert from '../../components/ui/FormAlert'
import IconOrb from '../../components/ui/IconOrb'
import Input from '../../components/ui/Input'
import PasswordInput from '../../components/ui/PasswordInput'
import { useAuth } from '../../context/AuthContext'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

// Login form.
export default function LoginPage() {
  useDocumentTitle('Log in')
  const { login, notice, clearNotice } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  // Keeps the typed values.
  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  // Sends the credentials. The API decides whether they are valid.
  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setFieldErrors({})
    clearNotice()

    try {
      await login(form.username, form.password)
    } catch (loginError) {
      setFieldErrors(getFieldErrors(loginError))
      setError(getErrorMessage(loginError))
      setBusy(false)
    }
  }

  return (
    <Card tone="solid" padding="lg" radius="panel" className="mx-auto w-full max-w-lg">
      <IconOrb icon={LockKeyhole} color="violet" className="animate-clay-float" />
      <h1 className="mt-6 font-heading text-4xl font-black tracking-tight text-ink">Welcome back</h1>
      <p className="mt-2 text-base leading-relaxed font-medium text-muted">
        Log in with your NIC number or email address.
      </p>

      <div className="mt-6 flex flex-col gap-3 empty:hidden">
        {notice && <Alert tone={notice.tone}>{notice.message}</Alert>}
        <FormAlert error={error} fieldErrors={fieldErrors} />
      </div>

      <form noValidate onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
        <Field label="NIC or email" error={fieldErrors.username} required>
          <Input
            name="username"
            size="lg"
            icon={UserRound}
            autoComplete="username"
            placeholder="e.g. admin@solargrid.lk"
            value={form.username}
            onChange={handleChange}
            autoFocus
          />
        </Field>
        <Field label="Password" error={fieldErrors.password} required>
          <PasswordInput
            name="password"
            size="lg"
            autoComplete="current-password"
            placeholder="Your password"
            value={form.password}
            onChange={handleChange}
          />
        </Field>
        <Button type="submit" size="lg" fullWidth loading={busy} iconRight={ArrowRight} className="mt-2">
          Log in
        </Button>
      </form>

      <p className="mt-8 flex items-start gap-3 rounded-tile bg-well p-4 text-sm leading-relaxed font-medium text-muted">
        <Smartphone aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent" />
        Prosumers book and manage energy slots in the Smart Solar mobile app.
      </p>
    </Card>
  )
}
