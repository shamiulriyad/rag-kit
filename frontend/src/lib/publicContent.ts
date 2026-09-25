import { useEffect, useState } from 'react'
import { request } from '../services/api'

export interface PublicContent {
  type: string
  slug: string
  title: string
  summary: string
  body: string
  publishedAt: string
}

/** Published CMS content for the marketing site. Returns null while loading and on any failure, so
 *  callers fall back to their built-in copy instead of showing an error on a public page. */
export function usePublicContent(type: string): PublicContent[] | null {
  const [items, setItems] = useState<PublicContent[] | null>(null)
  useEffect(() => {
    let cancelled = false
    request<PublicContent[]>(`/api/public/content?type=${encodeURIComponent(type)}`)
      .then((r) => !cancelled && setItems(r))
      .catch(() => !cancelled && setItems(null))
    return () => {
      cancelled = true
    }
  }, [type])
  return items
}
