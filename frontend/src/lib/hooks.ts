import { useCallback, useEffect, useRef, useState } from 'react'

/** State mirrored into localStorage. Falls back gracefully when storage is
    unavailable (private mode, thumbnails). */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw != null ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        try {
          localStorage.setItem(key, JSON.stringify(resolved))
        } catch {
          /* ignore */
        }
        return resolved
      })
    },
    [key],
  )

  return [value, set] as const
}

/** Calls `handler` on a pointer-down or Escape outside the referenced node. */
export function useDismiss<T extends HTMLElement>(
  active: boolean,
  handler: () => void,
) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!active) return
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) handler()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && handler()
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [active, handler])
  return ref
}
