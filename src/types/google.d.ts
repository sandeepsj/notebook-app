// Ambient declarations for Vite env vars and the Google Identity Services client.

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Minimal typings for the GIS token client loaded from
// https://accounts.google.com/gsi/client
declare namespace google.accounts.oauth2 {
  interface TokenResponse {
    access_token: string
    expires_in: number
    scope: string
    token_type: string
    error?: string
    error_description?: string
  }

  interface TokenClientConfig {
    client_id: string
    scope: string
    callback: (response: TokenResponse) => void
    error_callback?: (error: { type: string; message: string }) => void
    prompt?: '' | 'none' | 'consent' | 'select_account'
  }

  interface TokenClient {
    requestAccessToken: (overrides?: { prompt?: string }) => void
  }

  function initTokenClient(config: TokenClientConfig): TokenClient
  function revoke(token: string, done?: () => void): void
}

declare const google: {
  accounts: {
    oauth2: typeof google.accounts.oauth2
  }
}
