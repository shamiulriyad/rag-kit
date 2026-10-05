import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import AuthScaffold from '../components/app/AuthScaffold'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { resetPassword } from '../services/api'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset the password.')
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <AuthScaffold>
        <div className="auth__form">
          <div>
            <h1>Reset link missing</h1>
            <p className="muted">
              This page needs the link from your email. Open it from there, or request a new one.
            </p>
          </div>
          <Link className="btn btn--primary btn--block" to="/forgot-password">
            Request a new link
          </Link>
        </div>
      </AuthScaffold>
    )
  }

  if (done) {
    return (
      <AuthScaffold>
        <div className="auth__form">
          <div>
            <h1>Password updated</h1>
            <p className="muted">
              You've been signed out of every device. Sign in with your new password.
            </p>
          </div>
          <div className="secret-note">
            <CheckCircle2 />
            <span>Your email address is now confirmed too.</span>
          </div>
          <Link className="btn btn--primary btn--block" to="/login">
            Go to sign in
          </Link>
        </div>
      </AuthScaffold>
    )
  }

  return (
    <AuthScaffold>
      <form className="auth__form" onSubmit={onSubmit}>
        <div>
          <h1>Choose a new password</h1>
          <p className="muted">Use at least 8 characters.</p>
        </div>

        <Field label="New password">
          {(id) => (
            <Input
              id={id}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={128}
            />
          )}
        </Field>

        <Field label="Confirm new password" error={error ?? undefined}>
          {(id) => (
            <Input
              id={id}
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              maxLength={128}
            />
          )}
        </Field>

        <Button type="submit" block loading={busy}>
          Update password
        </Button>

        <p className="auth__alt">
          <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </AuthScaffold>
  )
}
