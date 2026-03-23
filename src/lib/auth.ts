import { SignJWT, jwtVerify } from 'jose'
import bcryptjs from 'bcryptjs'

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  return new TextEncoder().encode(secret)
}

function getExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN ?? '24h'
}

export interface JwtPayload {
  id: string
  role: string
}

export async function signToken(payload: JwtPayload): Promise<string> {
  const secret = getSecret()
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(getExpiresIn())
    .sign(secret)
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const secret = getSecret()
  const { payload } = await jwtVerify(token, secret)
  return payload as unknown as JwtPayload
}

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 10)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash)
}

/**
 * JWT_EXPIRES_IN文字列（例: '24h', '7d', '60m'）からexpires_atのISO 8601文字列を計算する
 */
export function calculateExpiresAt(expiresIn: string = getExpiresIn()): string {
  const now = Date.now()
  const match = expiresIn.match(/^(\d+)([smhd])$/)
  if (!match) {
    // デフォルト24h
    return new Date(now + 24 * 60 * 60 * 1000).toISOString()
  }
  const value = parseInt(match[1], 10)
  const unit = match[2]
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }
  const ms = value * (multipliers[unit] ?? 60 * 60 * 1000)
  return new Date(now + ms).toISOString()
}
