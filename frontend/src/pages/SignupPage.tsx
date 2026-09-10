import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Info } from 'lucide-react'
import AuthScaffold from '../components/app/AuthScaffold'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { useAuth } from '../lib/auth'

export default function SignupPage() {
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

        <div className="auth__mock">
          <Info />
          <span>
            Sign-up is mocked on the frontend and stored in this browser via
            localStorage. No backend account, no email, no password database.
          </span>
        </div>

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

        <Field label="Password" hint="Minimum 6 characters">
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
