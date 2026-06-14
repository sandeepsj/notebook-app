// Thin client for the shared LLM proxy (see the react-spa-google-stack skill).
// The proxy verifies the same Google access token the SPA already holds and
// forwards the body to the chosen provider's API. We never ship a provider key.

const PROXY = 'https://llm-proxy-smoky.vercel.app/api/proxy'

export type LlmProvider = 'openai' | 'anthropic' | 'google'

/**
 * Forward a request to a provider through the proxy. Returns the raw Response
 * so callers can branch on status (e.g. 401 → token expired → re-auth).
 */
export function llmProxy(
  provider: LlmProvider,
  endpoint: string,
  body: Record<string, unknown>,
  token: string,
): Promise<Response> {
  return fetch(PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ provider, endpoint, body }),
  })
}
