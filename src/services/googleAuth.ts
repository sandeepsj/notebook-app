// Google Identity Services (GIS) sign-in + session persistence.
//
// The canonical fix for the "logged out on refresh" bug (see the
// react-spa-google-stack skill): user info lives in localStorage (survives
// tab close, used for UI only); the access token lives in sessionStorage
// (cleared on tab close, matches the token's ~1h lifetime). On mount we read
// both synchronously — no GIS popup, no network call. On any 401 we clear
// both and re-authenticate.

import type { AuthState, GoogleUser } from '@/types'

const USER_KEY = 'notebook_user'
const TOKEN_KEY = 'notebook_token'

const SCOPES =
  'https://www.googleapis.com/auth/drive.file openid email profile'

function getClientId(): string {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!id) {
    throw new Error(
      'Missing VITE_GOOGLE_CLIENT_ID. Set it in .env (dev) and the GitHub Secret (prod).',
    )
  }
  return id
}

// ---- Session storage -------------------------------------------------------

export function saveSession(user: GoogleUser, token: string): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function loadSession(): AuthState | null {
  const token = sessionStorage.getItem(TOKEN_KEY)
  const raw = localStorage.getItem(USER_KEY)
  if (!token || !raw) return null
  try {
    return { isLoggedIn: true, user: JSON.parse(raw) as GoogleUser, accessToken: token }
  } catch {
    return null
  }
}

export function clearSession(): void {
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}

// ---- GIS script + sign-in --------------------------------------------------

let gisReady: Promise<void> | null = null

function loadGisScript(): Promise<void> {
  if (gisReady) return gisReady
  gisReady = new Promise<void>((resolve, reject) => {
    // The script is included in index.html with async/defer; poll until the
    // global is available, with a timeout so we fail loudly rather than hang.
    const start = performance.now()
    const tick = () => {
      if (typeof google !== 'undefined' && google.accounts?.oauth2) {
        resolve()
      } else if (performance.now() - start > 10_000) {
        reject(new Error('Google Identity Services failed to load.'))
      } else {
        setTimeout(tick, 50)
      }
    }
    tick()
  })
  return gisReady
}

async function fetchUserInfo(token: string): Promise<GoogleUser> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`userinfo ${res.status}`)
  const data = (await res.json()) as { email: string; name: string; picture: string }
  return { email: data.email, name: data.name, picture: data.picture }
}

/**
 * Trigger the GIS popup and resolve with a fresh session.
 * MUST be called from a user gesture (click) — browsers block the popup
 * otherwise.
 */
export async function signIn(): Promise<AuthState> {
  await loadGisScript()
  return new Promise<AuthState>((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: getClientId(),
      scope: SCOPES,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error))
          return
        }
        fetchUserInfo(response.access_token)
          .then((user) => {
            saveSession(user, response.access_token)
            resolve({ isLoggedIn: true, user, accessToken: response.access_token })
          })
          .catch(reject)
      },
      error_callback: (err) => reject(new Error(err.message)),
    })
    tokenClient.requestAccessToken()
  })
}

export function signOut(token: string): void {
  try {
    google.accounts.oauth2.revoke(token)
  } catch {
    // ignore — token may already be invalid
  }
  clearSession()
}
