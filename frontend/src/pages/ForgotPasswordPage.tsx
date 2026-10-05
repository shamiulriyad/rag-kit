import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import AuthScaffold from '../components/app/AuthScaffold'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { forgotPassword } from '../services/api'
import { usePlatformStatus } from '../lib/platformStatus'

export default function ForgotPasswordPage() {
  const platform = usePlatformStatus()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await forgotPassword(email.trim())
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <AuthScaffold>
        <div className="auth__form">
          <div>
            <h1>Check your email</h1>
            <p className="muted">
              If an account exists for <strong>{email.trim()}</strong>, a link to choose a new
              password is on its way. It stays valid for 1 hour.
            </p>
          </div>
          <div className="secret-note">
            <MailCheck />
            <span>
              Nothing arrived? Look in spam, wait a minute, then{' '}
              <button type="button" className="linkbtn" onClick={() => setSent(false)}>
                try again
              </button>
              .
            </span>
          </div>
          <p className="auth__alt">
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </AuthScaffold>
    )
  }

  return (
    <AuthScaffold>
      <form className="auth__form" onSubmit={onSubmit}>
        <div>
          <h1>Forgot your password?</h1>
          <p className="muted">Enter your email and we'll send you a link to reset it.</p>
        </div>

        {platform && !platform.emailEnabled && (
          <div className="secret-note">
            <MailCheck />
            <span>
              Email delivery isn't set up on this server, so reset links can't be sent. Ask the
              administrator to reset your password.
            </span>
          </div>
        )}

        <Field label="Email" error={error ?? undefined}>
          {(id) => (
            <Input
              id={id}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={254}
            />
          )}
        </Field>

        <Button type="submit" block loading={busy}>
          Send reset link
        </Button>

        <p className="auth__alt">
          Remembered it? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </AuthScaffold>
  )
}
