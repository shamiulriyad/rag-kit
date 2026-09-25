import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import AuthScaffold from '../components/app/AuthScaffold'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { useAuth } from '../lib/auth'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      // Once signed in, the guest-only route sends operators to /admin and everyone else to /dashboard.
      await signIn(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthScaffold>
      <form className="auth__form" onSubmit={onSubmit}>
        <div>
          <h1>Welcome back</h1>
          <p className="muted">Sign in to your RAG Starter workspace.</p>
        </div>

        <Field label="Email" error={error ?? undefined}>
          {(id) => (
            <Input
              id={id}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}
        </Field>

        <Field label="Password">
          {(id) => (
            <Input
              id={id}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}
        </Field>

        <Button type="submit" block loading={busy}>
          Sign In
        </Button>

        <p className="auth__alt">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </form>
    </AuthScaffold>
  )
}
