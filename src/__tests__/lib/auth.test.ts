// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { signToken, verifyToken, hashPassword, comparePassword, calculateExpiresAt } from '@/lib/auth'

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-unit-tests-min-32-chars'
  process.env.JWT_EXPIRES_IN = '24h'
})

describe('signToken / verifyToken', () => {
  it('ペイロードを含むJWTトークンを生成できる', async () => {
    const payload = { id: 'user-uuid-001', role: 'salesperson' }
    const token = await signToken(payload)
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3)
  })

  it('生成したトークンを検証してペイロードを取得できる', async () => {
    const payload = { id: 'user-uuid-001', role: 'manager' }
    const token = await signToken(payload)
    const decoded = await verifyToken(token)
    expect(decoded.id).toBe('user-uuid-001')
    expect(decoded.role).toBe('manager')
  })

  it('異なるユーザーIDとロールのトークンを正しく区別できる', async () => {
    const token1 = await signToken({ id: 'user-001', role: 'salesperson' })
    const token2 = await signToken({ id: 'user-002', role: 'admin' })
    const decoded1 = await verifyToken(token1)
    const decoded2 = await verifyToken(token2)
    expect(decoded1.id).toBe('user-001')
    expect(decoded2.id).toBe('user-002')
    expect(decoded1.role).toBe('salesperson')
    expect(decoded2.role).toBe('admin')
  })

  it('無効なトークンを検証するとエラーを投げる', async () => {
    await expect(verifyToken('invalid.token.here')).rejects.toThrow()
  })

  it('改ざんされたトークンを検証するとエラーを投げる', async () => {
    const token = await signToken({ id: 'user-001', role: 'salesperson' })
    const parts = token.split('.')
    // ペイロード部分を改ざん
    const tamperedPayload = Buffer.from(JSON.stringify({ id: 'user-001', role: 'admin' })).toString(
      'base64url',
    )
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`
    await expect(verifyToken(tamperedToken)).rejects.toThrow()
  })

  it('JWT_SECRETが未設定の場合にエラーを投げる', async () => {
    delete process.env.JWT_SECRET
    await expect(signToken({ id: 'user-001', role: 'salesperson' })).rejects.toThrow(
      'JWT_SECRET environment variable is not set',
    )
  })
})

describe('hashPassword / comparePassword', () => {
  it('パスワードをハッシュ化できる', async () => {
    const password = 'Password123'
    const hash = await hashPassword(password)
    expect(typeof hash).toBe('string')
    expect(hash).not.toBe(password)
    expect(hash.startsWith('$2')).toBe(true)
  })

  it('同じパスワードでも毎回異なるハッシュを生成する', async () => {
    const password = 'Password123'
    const hash1 = await hashPassword(password)
    const hash2 = await hashPassword(password)
    expect(hash1).not.toBe(hash2)
  })

  it('正しいパスワードとハッシュの照合がtrueを返す', async () => {
    const password = 'Password123'
    const hash = await hashPassword(password)
    const result = await comparePassword(password, hash)
    expect(result).toBe(true)
  })

  it('誤ったパスワードとハッシュの照合がfalseを返す', async () => {
    const password = 'Password123'
    const wrongPassword = 'WrongPassword'
    const hash = await hashPassword(password)
    const result = await comparePassword(wrongPassword, hash)
    expect(result).toBe(false)
  })

  it('空文字のパスワードとハッシュの照合がfalseを返す', async () => {
    const password = 'Password123'
    const hash = await hashPassword(password)
    const result = await comparePassword('', hash)
    expect(result).toBe(false)
  })
})

describe('calculateExpiresAt', () => {
  it('24hの場合に現在時刻から24時間後のISO文字列を返す', () => {
    const before = Date.now()
    const result = calculateExpiresAt('24h')
    const after = Date.now()
    const expiresAt = new Date(result).getTime()
    expect(expiresAt).toBeGreaterThanOrEqual(before + 24 * 60 * 60 * 1000)
    expect(expiresAt).toBeLessThanOrEqual(after + 24 * 60 * 60 * 1000)
  })

  it('7dの場合に現在時刻から7日後のISO文字列を返す', () => {
    const before = Date.now()
    const result = calculateExpiresAt('7d')
    const after = Date.now()
    const expiresAt = new Date(result).getTime()
    expect(expiresAt).toBeGreaterThanOrEqual(before + 7 * 24 * 60 * 60 * 1000)
    expect(expiresAt).toBeLessThanOrEqual(after + 7 * 24 * 60 * 60 * 1000)
  })

  it('60mの場合に現在時刻から60分後のISO文字列を返す', () => {
    const before = Date.now()
    const result = calculateExpiresAt('60m')
    const after = Date.now()
    const expiresAt = new Date(result).getTime()
    expect(expiresAt).toBeGreaterThanOrEqual(before + 60 * 60 * 1000)
    expect(expiresAt).toBeLessThanOrEqual(after + 60 * 60 * 1000)
  })

  it('ISO 8601形式の文字列を返す', () => {
    const result = calculateExpiresAt('1h')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })
})
