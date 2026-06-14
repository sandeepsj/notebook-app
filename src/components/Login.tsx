import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export function Login() {
  const { signIn, signingIn } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async () => {
    setError(null)
    try {
      await signIn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed')
    }
  }

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-mark" aria-hidden="true">
          ✎
        </div>
        <h1 className="login-title">Notebook</h1>
        <p className="login-sub">
          Handwrite with your stylus. Your notebooks live in your own Google
          Drive.
        </p>
        <button className="btn btn-primary login-btn" onClick={handleSignIn} disabled={signingIn}>
          {signingIn ? 'Signing in…' : 'Sign in with Google'}
        </button>
        {error && <p className="login-error">{error}</p>}
      </div>
    </div>
  )
}
