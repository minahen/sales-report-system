/**
 * クライアントサイドAPIクライアント
 * localStorageからJWTトークンを取得してAuthorizationヘッダーに付与する
 */

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export interface StoredUser {
  id: string
  name: string
  email: string
  role: string
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredUser
  } catch {
    return null
  }
}

export function setStoredUser(user: StoredUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T; ok: true } | { error: { code: string; message: string }; ok: false }> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const res = await fetch(path, { ...options, headers })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      return {
        ok: false,
        error: (json as { error?: { code: string; message: string } }).error ?? {
          code: 'SYS-002',
          message: 'エラーが発生しました',
        },
      }
    }

    return { ok: true, data: json as T }
  } catch {
    return {
      ok: false,
      error: { code: 'SYS-001', message: '通信エラーが発生しました' },
    }
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
