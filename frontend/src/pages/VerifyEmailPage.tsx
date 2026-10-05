import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthScaffold from '../components/app/AuthScaffold'
import { verifyEmail } from '../services/api'
import { useAuth } from '../lib/auth'

type State = { kind: 'working' } | { kind: 'ok' } | { kind: 'error'; message: string }

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { user, refreshUser } = useAuth()
  const [state, setState] = useState<State>(
    token ? { kind: 'working' } : { kind: 'error', message: 'This page needs the link from your email.' },
  )
  // A verification link is single-use: React's dev double-mount must not spend it twice.
  const started = useRef(false)

  useEffect(() => {
    if (!token || started.current) return
    started.current = true
    verifyEmail(token)
      .then(() => {
        setState({ kind: 'ok' })
        // If the person is signed in, drop the "verify your email" banner right away.
        refreshUser().catch(() => {})
      })
      .catch((err) =>
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Could not verify your email.',
        }),
      )
  }, [token, refreshUser])

  return (
    <AuthScaffold>
      <div className="auth__form">
        {state.kind === 'working' && (
          <>
            <h1>Verifying…</h1>
            <p className="muted">Hold on while we confirm your email address.</p>
            <span className="spinner" />
          </>
        )}
        {state.kind === 'ok' && (
          <>
            <div>
              <h1>Email verified</h1>
              <p className="muted">Thanks - your email address is confirmed.</p>
            </div>
            <Link className="btn btn--primary btn--block" to={user ? '/dashboard' : '/login'}>
              {user ? 'Go to dashboard' : 'Go to sign in'}
            </Link>
          </>
        )}
        {state.kind === 'error' && (
          <>
            <div>
              <h1>We couldn't verify that link</h1>
              <p className="muted">{state.message}</p>
            </div>
            <Link className="btn btn--secondary btn--block" to={user ? '/dashboard' : '/login'}>
              {user ? 'Back to the app' : 'Back to sign in'}
            </Link>
            {user && (
              <p className="muted" style={{ fontSize: '0.84rem', textAlign: 'center' }}>
                You can request a fresh link from the banner at the top of the app.
              </p>
            )}
          </>
        )}
      </div>
    </AuthScaffold>
  )
}
