import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthScaffold from '../components/app/AuthScaffold'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { usePlatformStatus } from '../lib/platformStatus'
import { useAuth } from '../lib/auth'

export default function SignupPage() {
  const platform = usePlatformStatus()
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signUp(name, email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthScaffold>
      <form className="auth__form" onSubmit={onSubmit}>
        <div>
          <h1>Create your account</h1>
          <p className="muted">Spin up a RAG Starter workspace in seconds.</p>
        </div>

        {platform && !platform.signupsEnabled && (
          <p className="field__error" role="alert">
            New sign-ups are currently closed. Existing accounts can still sign in.
          </p>
        )}

        <Field label="Full name">
          {(id) => (
            <Input
              id={id}
              autoComplete="name"
              placeholder="Ada Lovelace"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
        </Field>

        <Field label="Work email" error={error ?? undefined}>
          {(id) => (
            <Input
              id={id}
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}
        </Field>

        <Field label="Password" hint="Minimum 8 characters">
          {(id) => (
            <Input
              id={id}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}
        </Field>

        <Button type="submit" block loading={busy}>
          Create Account
        </Button>

        <p className="auth__alt">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </AuthScaffold>
  )
}
