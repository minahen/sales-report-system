// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST as loginPost } from '@/app/api/auth/login/route'
import { POST as logoutPost } from '@/app/api/auth/logout/route'
import { POST as refreshPost } from '@/app/api/auth/refresh/route'
import { NextRequest } from 'next/server'
import { signToken } from '@/lib/auth'

// Prismaをモック化
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

const mockPrismaUser = prisma.user as { findUnique: ReturnType<typeof vi.fn> }

function makeRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('API-AUTH-001: 正しい認証情報（営業ロール）で200とトークンが返る', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({
      id: 'user-001',
      name: '田中 太郎',
      email: 'tanaka@example.com',
      passwordHash: '$2a$12$someValidHashedPassword',
      role: 'salesperson',
    })

    // comparePasswordをモック（bcryptを使うため実際のハッシュを生成）
    const { hashPassword } = await import('@/lib/auth')
    const hash = await hashPassword('Password01')
    mockPrismaUser.findUnique.mockResolvedValue({
      id: 'user-001',
      name: '田中 太郎',
      email: 'tanaka@example.com',
      passwordHash: hash,
      role: 'salesperson',
    })

    const req = makeRequest({ email: 'tanaka@example.com', password: 'Password01' })
    const res = await loginPost(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.token).toBeDefined()
    expect(typeof json.data.token).toBe('string')
    expect(json.data.user.role).toBe('salesperson')
    expect(json.data.user.email).toBe('tanaka@example.com')
    expect(json.data.expires_at).toBeDefined()
  })

  it('API-AUTH-002: 上長ロールでログインするとrole=managerが返る', async () => {
    const { hashPassword } = await import('@/lib/auth')
    const hash = await hashPassword('Password03')
    mockPrismaUser.findUnique.mockResolvedValue({
      id: 'user-003',
      name: '山田 一郎',
      email: 'yamada@example.com',
      passwordHash: hash,
      role: 'manager',
    })

    const req = makeRequest({ email: 'yamada@example.com', password: 'Password03' })
    const res = await loginPost(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.user.role).toBe('manager')
  })

  it('API-AUTH-003: メールアドレスが空文字の場合400とL-01コードが返る', async () => {
    const req = makeRequest({ email: '', password: 'Password01' })
    const res = await loginPost(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error.details).toBeDefined()
    const detail = json.error.details.find((d: { code: string }) => d.code === 'L-01')
    expect(detail).toBeDefined()
  })

  it('API-AUTH-004: メールアドレス形式不正の場合400とL-02コードが返る', async () => {
    const req = makeRequest({ email: 'not-an-email', password: 'Password01' })
    const res = await loginPost(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    const detail = json.error.details.find((d: { code: string }) => d.code === 'L-02')
    expect(detail).toBeDefined()
  })

  it('API-AUTH-005: パスワードが空文字の場合400とL-03コードが返る', async () => {
    const req = makeRequest({ email: 'tanaka@example.com', password: '' })
    const res = await loginPost(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    const detail = json.error.details.find((d: { code: string }) => d.code === 'L-03')
    expect(detail).toBeDefined()
  })

  it('API-AUTH-006: パスワードが7文字の場合400とL-04コードが返る', async () => {
    const req = makeRequest({ email: 'tanaka@example.com', password: 'Pass123' })
    const res = await loginPost(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    const detail = json.error.details.find((d: { code: string }) => d.code === 'L-04')
    expect(detail).toBeDefined()
  })

  it('API-AUTH-007: 正しいメールアドレスだが誤ったパスワードの場合401とBIZ-001が返る', async () => {
    const { hashPassword } = await import('@/lib/auth')
    const hash = await hashPassword('CorrectPass123')
    mockPrismaUser.findUnique.mockResolvedValue({
      id: 'user-001',
      name: '田中 太郎',
      email: 'tanaka@example.com',
      passwordHash: hash,
      role: 'salesperson',
    })

    const req = makeRequest({ email: 'tanaka@example.com', password: 'WrongPass99' })
    const res = await loginPost(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error.code).toBe('BIZ-001')
  })

  it('API-AUTH-008: 存在しないメールアドレスの場合401とBIZ-001が返る', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null)

    const req = makeRequest({ email: 'nobody@example.com', password: 'Password01' })
    const res = await loginPost(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error.code).toBe('BIZ-001')
  })
})

describe('POST /api/auth/logout', () => {
  it('API-AUTH-020: 有効なトークンでログアウトすると204が返る', async () => {
    const res = await logoutPost()
    expect(res.status).toBe(204)
  })
})

describe('POST /api/auth/refresh', () => {
  it('API-AUTH-030: 有効なトークンでリフレッシュすると新しいトークンが返る', async () => {
    const token = await signToken({
      sub: 'user-001',
      name: '田中 太郎',
      email: 'tanaka@example.com',
      role: 'salesperson',
    })

    const req = new NextRequest('http://localhost/api/auth/refresh', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-001',
        'x-user-name': 'Tanaka Taro',
        'x-user-email': 'tanaka@example.com',
        'x-user-role': 'salesperson',
        Authorization: `Bearer ${token}`,
      },
    })

    const res = await refreshPost(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.token).toBeDefined()
    expect(typeof json.data.token).toBe('string')
    expect(json.data.expires_at).toBeDefined()
    // 新しいトークンが生成される
    expect(json.data.token).not.toBe(token)
  })
})
