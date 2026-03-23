import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import type { Role } from '@/types'

/** JWT署名に使用するシークレットを取得する。本番環境では JWT_SECRET の設定が必須 */
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production')
    }
    return new TextEncoder().encode('fallback-secret-for-development-only')
  }
  return new TextEncoder().encode(secret)
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '24h'

export interface JwtPayload {
  sub: string   // user id
  name: string
  email: string
  role: Role
  iat?: number
  exp?: number
}

/** JWTトークンを生成する */
export async function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(getJwtSecret())
}

/** JWTトークンを検証してペイロードを返す。無効な場合は null を返す */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    return payload as unknown as JwtPayload
  } catch {
    return null
  }
}

/** トークンの有効期限を ISO 8601 文字列で返す */
export function getTokenExpiry(): string {
  const ms = parseExpiresIn(JWT_EXPIRES_IN)
  return new Date(Date.now() + ms).toISOString()
}

/** パスワードをbcryptでハッシュ化する */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/** パスワードとハッシュを照合する */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/** "24h" / "7d" / "3600" などを ms に変換 */
function parseExpiresIn(value: string): number {
  const num = parseInt(value, 10)
  if (value.endsWith('d')) return num * 24 * 60 * 60 * 1000
  if (value.endsWith('h')) return num * 60 * 60 * 1000
  if (value.endsWith('m')) return num * 60 * 1000
  return num * 1000 // 秒
}
