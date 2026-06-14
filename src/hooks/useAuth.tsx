// Auth context: restores the session synchronously on mount (no popup, no
// network) and exposes sign-in / sign-out. On a Drive/proxy 401 the app calls
// `forceReauth()` to clear the stale token and drop back to the login screen.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AuthState } from '@/types'
import {
  loadSession,
  signIn as gisSignIn,
  signOut as gisSignOut,
  clearSession,
} from '@/services/googleAuth'

interface AuthContextValue {
  auth: AuthState | null
  /** True only during the initial sign-in popup flow. */
  signingIn: boolean
  signIn: () => Promise<void>
  signOut: () => void
  /** Clear the stale token and show the login screen (call on a 401). */
  forceReauth: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Restore synchronously from storage at mount via a lazy initializer — the
  // key to surviving a refresh, with no popup and no network call.
  const [auth, setAuth] = useState<AuthState | null>(() => loadSession())
  const [signingIn, setSigningIn] = useState(false)

  const signIn = useCallback(async () => {
    setSigningIn(true)
    try {
      setAuth(await gisSignIn())
    } finally {
      setSigningIn(false)
    }
  }, [])

  const signOut = useCallback(() => {
    if (auth) gisSignOut(auth.accessToken)
    else clearSession()
    setAuth(null)
  }, [auth])

  const forceReauth = useCallback(() => {
    clearSession()
    setAuth(null)
  }, [])

  const value = useMemo(
    () => ({ auth, signingIn, signIn, signOut, forceReauth }),
    [auth, signingIn, signIn, signOut, forceReauth],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
