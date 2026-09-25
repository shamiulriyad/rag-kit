import { useEffect, useState } from 'react'
import { request } from '../services/api'

export interface PlatformStatus {
  maintenanceMode: boolean
  maintenanceMessage: string
  signupsEnabled: boolean
}

/** What the operator has switched on or off (maintenance, sign-ups). null until the first answer, and
 *  again if the API cannot be reached, so callers never show a state they have not confirmed. */
export function usePlatformStatus(pollMs = 0): PlatformStatus | null {
  const [status, setStatus] = useState<PlatformStatus | null>(null)
  useEffect(() => {
    let cancelled = false
    const load = () =>
      request<PlatformStatus>('/api/public/status')
        .then((s) => !cancelled && setStatus(s))
        .catch(() => !cancelled && setStatus(null))
    load()
    const t = pollMs > 0 ? setInterval(load, pollMs) : undefined
    return () => {
      cancelled = true
      if (t) clearInterval(t)
    }
  }, [pollMs])
  return status
}
