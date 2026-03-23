// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    dailyReport: {
      count: vi.fn(),
    },
    comment: {
      count: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
const mockUser = prisma.user as {
  findMany: ReturnType<typeof vi.fn>
  findUnique: ReturnType<typeof vi.fn>
  findFirst: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  count: ReturnType<typeof vi.fn>
}
const mockDailyReport = prisma.dailyReport as { count: ReturnType<typeof vi.fn> }
const mockComment = prisma.comment as { count: ReturnType<typeof vi.fn> }

function makeRequest(url: string, options: RequestInit = {}, role = 'admin'): NextRequest {
  return new NextRequest(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'admin-001',
      'x-user-role': role,
      'x-user-name': 'Sato Kanri',
      'x-user-email': 'sato@example.com',
      ...(options.headers as Record<string, string> ?? {}),
    },
  })
}

const sampleSalesperson = {
  id: 'user-001',
  name: '田中 太郎',
  email: 'tanaka@example.com',
  passwordHash: '$2a$12$hashedpassword',
  role: 'salesperson',
  managerId: 'user-003',
  deletedAt: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  manager: { id: 'user-003', name: '山田 一郎' },
}

describe('GET /api/salespeople', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser.count.mockResolvedValue(1)
    mockUser.findMany.mockResolvedValue([sampleSalesperson])
  })

  it('API-SALES-001: 管理者トークンで担当者一覧が返る', async () => {
    const { GET } = await import('@/app/api/salespeople/route')
    const req = makeRequest('http://localhost/api/salespeople')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(json.data)).toBe(true)
    expect(json.meta.total).toBe(1)
    // パスワードが含まれないことを確認
    expect(json.data[0]).not.toHaveProperty('passwordHash')
    expect(json.data[0]).not.toHaveProperty('password')
  })

  it('API-SALES-002: 上長ロールでアクセスすると403とSYS-004が返る', async () => {
    const { GET } = await import('@/app/api/salespeople/route')
    const req = makeRequest('http://localhost/api/salespeople', {}, 'manager')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error.code).toBe('SYS-004')
  })
})

describe('POST /api/salespeople', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser.findUnique.mockResolvedValue(null) // メール重複なし
    mockUser.findFirst.mockResolvedValue(null) // メール重複なし (findFirst用)
    mockUser.create.mockResolvedValue({
      ...sampleSalesperson,
      id: 'new-user',
    })
  })

  it('API-SALES-010: 正常な担当者登録で201が返り、パスワードが含まれない', async () => {
    const { POST } = await import('@/app/api/salespeople/route')
    const req = makeRequest('http://localhost/api/salespeople', {
      method: 'POST',
      body: JSON.stringify({
        name: '新人 太郎',
        email: 'newuser@example.com',
        password: 'Password99',
        role: 'salesperson',
      }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data).not.toHaveProperty('passwordHash')
    expect(json.data).not.toHaveProperty('password')
  })

  it('API-SALES-011: nameが空文字の場合400とSE-01が返る', async () => {
    const { POST } = await import('@/app/api/salespeople/route')
    const req = makeRequest('http://localhost/api/salespeople', {
      method: 'POST',
      body: JSON.stringify({ name: '', email: 'test@test.com', password: 'Password99', role: 'salesperson' }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    const detail = json.error.details?.find((d: { code: string }) => d.code === 'SE-01')
    expect(detail).toBeDefined()
  })

  it('API-SALES-012: 既存のメールアドレスで登録しようとすると409とBIZ-006が返る', async () => {
    mockUser.findFirst.mockResolvedValue(sampleSalesperson) // 重複あり

    const { POST } = await import('@/app/api/salespeople/route')
    const req = makeRequest('http://localhost/api/salespeople', {
      method: 'POST',
      body: JSON.stringify({
        name: 'テスト',
        email: 'tanaka@example.com',
        password: 'Password99',
        role: 'salesperson',
      }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error.code).toBe('BIZ-006')
  })

  it('API-SALES-013: パスワードが7文字の場合400とSE-07が返る', async () => {
    const { POST } = await import('@/app/api/salespeople/route')
    const req = makeRequest('http://localhost/api/salespeople', {
      method: 'POST',
      body: JSON.stringify({ name: 'テスト', email: 'test@test.com', password: 'Pass123', role: 'salesperson' }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    const detail = json.error.details?.find((d: { code: string }) => d.code === 'SE-07')
    expect(detail).toBeDefined()
  })

  it('API-SALES-014: パスワードが英字のみの場合400とSE-08が返る', async () => {
    const { POST } = await import('@/app/api/salespeople/route')
    const req = makeRequest('http://localhost/api/salespeople', {
      method: 'POST',
      body: JSON.stringify({ name: 'テスト', email: 'test@test.com', password: 'aaaaaaaa', role: 'salesperson' }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    const detail = json.error.details?.find((d: { code: string }) => d.code === 'SE-08')
    expect(detail).toBeDefined()
  })

  it('API-SALES-015: roleが空文字の場合400とSE-09が返る', async () => {
    const { POST } = await import('@/app/api/salespeople/route')
    const req = makeRequest('http://localhost/api/salespeople', {
      method: 'POST',
      body: JSON.stringify({ name: 'テスト', email: 'test@test.com', password: 'Password99', role: '' }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error.details).toBeDefined()
    expect(json.error.details?.some((d: { code: string }) => d.code === 'SE-09')).toBe(true)
  })
})

describe('PUT /api/salespeople/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser.findUnique.mockResolvedValue(sampleSalesperson)
    mockUser.update.mockResolvedValue(sampleSalesperson)
  })

  it('API-SALES-021: manager_idに自分自身を指定すると409とBIZ-007が返る', async () => {
    const { PUT } = await import('@/app/api/salespeople/[id]/route')
    const req = makeRequest('http://localhost/api/salespeople/user-001', {
      method: 'PUT',
      body: JSON.stringify({
        name: '田中 太郎',
        email: 'tanaka@example.com',
        role: 'salesperson',
        manager_id: 'user-001', // 自分自身
      }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: 'user-001' }) })
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error.code).toBe('BIZ-007')
  })
})

describe('DELETE /api/salespeople/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('API-SALES-031: 日報が存在する担当者を削除しようとすると409とBIZ-009が返る', async () => {
    mockUser.findUnique.mockResolvedValue(sampleSalesperson)
    mockDailyReport.count.mockResolvedValue(3) // 日報あり
    mockComment.count.mockResolvedValue(0)

    const { DELETE } = await import('@/app/api/salespeople/[id]/route')
    const req = makeRequest('http://localhost/api/salespeople/user-001', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'user-001' }) })
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error.code).toBe('BIZ-009')
  })

  it('API-SALES-030: 日報・コメントが存在しない担当者を削除すると204が返る', async () => {
    mockUser.findUnique.mockResolvedValue(sampleSalesperson)
    mockDailyReport.count.mockResolvedValue(0)
    mockComment.count.mockResolvedValue(0)
    mockUser.update.mockResolvedValue({ ...sampleSalesperson, deletedAt: new Date() })

    const { DELETE } = await import('@/app/api/salespeople/[id]/route')
    const req = makeRequest('http://localhost/api/salespeople/user-001', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'user-001' }) })

    expect(res.status).toBe(204)
  })
})
