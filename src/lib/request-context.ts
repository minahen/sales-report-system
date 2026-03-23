import type { NextRequest } from 'next/server'
import type { Role, AuthUser } from '@/types'

/**
 * ミドルウェアがリクエストヘッダーに埋め込んだ認証済みユーザー情報を取得する。
 * ミドルウェアが正しく機能していれば必ず値が存在する。
 */
export function getAuthUser(req: NextRequest): AuthUser {
  return {
    id: req.headers.get('x-user-id') ?? '',
    name: req.headers.get('x-user-name') ?? '',
    email: req.headers.get('x-user-email') ?? '',
    role: (req.headers.get('x-user-role') ?? 'salesperson') as Role,
  }
}
