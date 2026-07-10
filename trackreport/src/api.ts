// Small client to talk to your backend.
// It automatically adds the authentication token to each request.

const BASE = 'http://localhost:3000'
const TOKEN_KEY = 'tr_token'

// --- Token management (stored in the browser) ---
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

// --- Generic API call ---
export async function api(path: string, options: RequestInit = {}) {
  const token = getToken()

  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })

  if (!res.ok) {
    let message = `Error ${res.status}`
    try {
      const body = await res.json()
      message = body.error || body.detail || message
    } catch {}
    throw new Error(message)
  }

  // Some responses don't have a body (e.g.: deletion).
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// Handy shortcuts.
export const apiGet = (path: string) => api(path)
export const apiPost = (path: string, body: unknown) =>
  api(path, { method: 'POST', body: JSON.stringify(body) })
export const apiPatch = (path: string, body: unknown) =>
  api(path, { method: 'PATCH', body: JSON.stringify(body) })
export const apiDelete = (path: string) => api(path, { method: 'DELETE' })