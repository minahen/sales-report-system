// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    customer: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    visitRecord: {
      count: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
const mockCustomer = prisma.customer as {
  findMany: ReturnType<typeof vi.fn>
  findUnique: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  count: ReturnType<typeof vi.fn>
}
const mockVisitRecord = prisma.visitRecord as { count: ReturnType<typeof vi.fn> }

function makeRequest(
  url: string,
  options: RequestInit = {},
  role = 'admin'
): NextRequest {
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

const sampleCustomer = {
  id: 'cust-001',
  name: '株式会社アルファ',
  address: '東京都千代田区',
  phone: '03-1111-1111',
  industry: '製造業',
  deletedAt: null,
  createdAt: new Date('2024-01-10T00:00:00Z'),
  updatedAt: new Date('2024-01-10T00:00:00Z'),
}

describe('GET /api/customers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCustomer.count.mockResolvedValue(1)
    mockCustomer.findMany.mockResolvedValue([sampleCustomer])
  })

  it('API-CUST-001: 管理者トークンで顧客一覧が返る', async () => {
    const { GET } = await import('@/app/api/customers/route')
    const req = makeRequest('http://localhost/api/customers')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(json.data)).toBe(true)
    expect(json.meta.total).toBe(1)
  })

  it('API-CUST-004: 営業ロールでアクセスすると403とSYS-004が返る', async () => {
    const { GET } = await import('@/app/api/customers/route')
    const req = makeRequest('http://localhost/api/customers', {}, 'salesperson')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error.code).toBe('SYS-004')
  })
})

describe('GET /api/customers/select-options', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCustomer.findMany.mockResolvedValue([
      { id: 'cust-001', name: '株式会社アルファ' },
      { id: 'cust-002', name: '株式会社ベータ' },
    ])
  })

  it('API-CUST-010: 顧客選択肢一覧がidとnameのみで返る', async () => {
    const { GET } = await import('@/app/api/customers/select-options/route')
    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toHaveLength(2)
    expect(json.data[0]).toHaveProperty('id')
    expect(json.data[0]).toHaveProperty('name')
    expect(json.data[0]).not.toHaveProperty('phone')
    expect(json.data[0]).not.toHaveProperty('industry')
  })
})

describe('POST /api/customers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCustomer.create.mockResolvedValue({
      ...sampleCustomer,
      id: 'new-cust',
      name: '株式会社デルタ',
    })
  })

  it('API-CUST-020: 正常な顧客登録で201が返る', async () => {
    const { POST } = await import('@/app/api/customers/route')
    const req = makeRequest('http://localhost/api/customers', {
      method: 'POST',
      body: JSON.stringify({ name: '株式会社デルタ', industry: 'IT' }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data.name).toBe('株式会社デルタ')
  })

  it('API-CUST-021: 顧客名が空文字の場合400とCE-01が返る', async () => {
    const { POST } = await import('@/app/api/customers/route')
    const req = makeRequest('http://localhost/api/customers', {
      method: 'POST',
      body: JSON.stringify({ name: '' }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    const detail = json.error.details?.find((d: { code: string }) => d.code === 'CE-01')
    expect(detail).toBeDefined()
  })

  it('API-CUST-022: 顧客名が101文字の場合400とCE-02が返る', async () => {
    const { POST } = await import('@/app/api/customers/route')
    const req = makeRequest('http://localhost/api/customers', {
      method: 'POST',
      body: JSON.stringify({ name: 'a'.repeat(101) }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    const detail = json.error.details?.find((d: { code: string }) => d.code === 'CE-02')
    expect(detail).toBeDefined()
  })

  it('API-CUST-023: 電話番号に無効文字が含まれる場合400とCE-04が返る', async () => {
    const { POST } = await import('@/app/api/customers/route')
    const req = makeRequest('http://localhost/api/customers', {
      method: 'POST',
      body: JSON.stringify({ name: 'テスト', phone: 'invalid' }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    const detail = json.error.details?.find((d: { code: string }) => d.code === 'CE-04')
    expect(detail).toBeDefined()
  })

  it('API-CUST-024: 上長ロールでPOSTすると403が返る', async () => {
    const { POST } = await import('@/app/api/customers/route')
    const req = makeRequest('http://localhost/api/customers', {
      method: 'POST',
      body: JSON.stringify({ name: 'テスト株式会社' }),
    }, 'manager')
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error.code).toBe('SYS-004')
  })
})

describe('DELETE /api/customers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('API-CUST-031: 訪問記録に紐づく顧客を削除しようとすると409とBIZ-008が返る', async () => {
    mockCustomer.findUnique.mockResolvedValue(sampleCustomer)
    mockVisitRecord.count.mockResolvedValue(3) // 訪問記録あり

    const { DELETE } = await import('@/app/api/customers/[id]/route')
    const req = makeRequest('http://localhost/api/customers/cust-001', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'cust-001' }) })
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error.code).toBe('BIZ-008')
  })

  it('API-CUST-030: 訪問記録に紐づかない顧客を削除すると204が返る', async () => {
    mockCustomer.findUnique.mockResolvedValue(sampleCustomer)
    mockVisitRecord.count.mockResolvedValue(0) // 訪問記録なし
    mockCustomer.update.mockResolvedValue({ ...sampleCustomer, deletedAt: new Date() })

    const { DELETE } = await import('@/app/api/customers/[id]/route')
    const req = makeRequest('http://localhost/api/customers/cust-001', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'cust-001' }) })

    expect(res.status).toBe(204)
  })
})
