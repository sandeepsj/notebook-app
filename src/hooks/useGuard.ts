import { useCallback, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { UnauthorizedError } from '@/services/drive'

/**
 * Wraps Drive calls so an expired token (401) clears the session and drops to
 * the login screen, and other errors surface via `error`. All setState happens
 * after awaiting, so `guard` is safe to call from a mount effect.
 */
export function useGuard() {
  const { forceReauth } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const guard = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      try {
        const result = await fn()
        setError(null)
        return result
      } catch (e) {
        if (e instanceof UnauthorizedError) {
          forceReauth()
          return undefined
        }
        setError(e instanceof Error ? e.message : 'Something went wrong')
        return undefined
      }
    },
    [forceReauth],
  )

  return { guard, error, setError }
}
