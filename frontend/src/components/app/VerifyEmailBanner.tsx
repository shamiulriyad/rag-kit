import { useState } from 'react'
import { MailWarning } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { usePlatformStatus } from '../../lib/platformStatus'
import { resendVerification } from '../../services/api'
import { useToast } from '../ui/Toast'

/** Asks signed-in users to confirm their email. Shown only when the server can really send email
 *  (otherwise the button could never work) and the account is still unverified. */
export default function VerifyEmailBanner() {
  const { user } = useAuth()
  const platform = usePlatformStatus()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [hidden, setHidden] = useState(false)

  if (!user || user.emailVerified !== false || !platform?.emailEnabled || hidden) return null

  async function resend() {
    setBusy(true)
    try {
      await resendVerification()
      toast('ok', 'Verification email sent. Check your inbox.')
    } catch (err) {
      toast('err', err instanceof Error ? err.message : 'Could not send the email.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="verify-banner" role="status">
      <MailWarning size={16} />
      <span>
        Confirm your email address (<strong>{user.email}</strong>) - we sent you a link when you
        signed up.
      </span>
      <button type="button" className="linkbtn" onClick={resend} disabled={busy}>
        {busy ? 'Sending…' : 'Resend email'}
      </button>
      <button type="button" className="linkbtn linkbtn--muted" onClick={() => setHidden(true)}>
        Dismiss
      </button>
    </div>
  )
}
