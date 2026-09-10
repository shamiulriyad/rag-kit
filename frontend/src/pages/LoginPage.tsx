import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Info } from 'lucide-react'
import AuthScaffold from '../components/app/AuthScaffold'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { useAuth } from '../lib/auth'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('developer@ragstarter.dev')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email, password)
      navigate('/dashboard', { replace: true })
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

        <div className="auth__mock">
          <Info />
          <span>
            Authentication is frontend-only for now — any valid-looking email and
            a 6+ character password will sign you in. Nothing is sent to a server.
          </span>
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

        <Field
          label="Password"
          hint="Minimum 6 characters"
        >
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
