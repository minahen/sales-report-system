// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    dailyReport: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    visitRecord: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '@/lib/prisma'

const mockReport = prisma.dailyReport as {
  findMany: ReturnType<typeof vi.fn>
  findUnique: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  count: ReturnType<typeof vi.fn>
}

async function makeAuthRequest(
  url: string,
  options: RequestInit = {},
  userId = 'user-001',
  role: string = 'salesperson'
): Promise<NextRequest> {
  return new NextRequest(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
      'x-user-role': role,
      'x-user-name': 'Tanaka Taro',
      'x-user-email': 'tanaka@example.com',
      ...(options.headers as Record<string, string> ?? {}),
    },
  })
}

const sampleReport = {
  id: 'report-001',
  reportDate: new Date('2024-11-20'),
  status: 'draft',
  problem: null,
  plan: null,
  salespersonId: 'user-001',
  createdAt: new Date('2024-11-20T08:00:00Z'),
  updatedAt: new Date('2024-11-20T08:00:00Z'),
  salesperson: { id: 'user-001', name: '田中 太郎' },
  visitRecords: [],
  comments: [],
  _count: { visitRecords: 0 },
}

describe('GET /api/daily-reports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReport.count.mockResolvedValue(1)
    mockReport.findMany.mockResolvedValue([sampleReport])
  })

  it('API-RPT-001: ログインユーザーの日報のみ返す', async () => {
    const { GET } = await import('@/app/api/daily-reports/route')
    const req = await makeAuthRequest('http://localhost/api/daily-reports')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(json.data)).toBe(true)
    expect(json.meta).toBeDefined()
    expect(json.meta.total).toBe(1)
  })

  it('API-RPT-002: statusクエリで絞り込みが可能', async () => {
    mockReport.findMany.mockResolvedValue([{ ...sampleReport, status: 'submitted' }])

    const { GET } = await import('@/app/api/daily-reports/route')
    const req = await makeAuthRequest('http://localhost/api/daily-reports?status=submitted')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data[0].status).toBe('submitted')
  })

  it('API-RPT-004: ページネーション情報が正しく返る', async () => {
    mockReport.count.mockResolvedValue(3)
    mockReport.findMany.mockResolvedValue([sampleReport, sampleReport])

    const { GET } = await import('@/app/api/daily-reports/route')
    const req = await makeAuthRequest('http://localhost/api/daily-reports?page=1&per_page=2')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.meta.total).toBe(3)
    expect(json.meta.page).toBe(1)
    expect(json.meta.per_page).toBe(2)
  })
})

describe('POST /api/daily-reports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReport.findUnique.mockResolvedValue(null) // 重複なし
    mockReport.create.mockResolvedValue({
      ...sampleReport,
      id: 'new-report',
      status: 'draft',
    })
  })

  it('API-RPT-030: 有効なdraftデータで201と日報が返る', async () => {
    const { POST } = await import('@/app/api/daily-reports/route')
    const req = await makeAuthRequest('http://localhost/api/daily-reports', {
      method: 'POST',
      body: JSON.stringify({
        report_date: '2024-11-20',
        status: 'draft',
        visit_records: [],
      }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data).toBeDefined()
    expect(json.data.status).toBe('draft')
  })

  it('API-RPT-032: visit_records[0].customer_idが空の場合400とRE-01が返る', async () => {
    const { POST } = await import('@/app/api/daily-reports/route')
    const req = await makeAuthRequest('http://localhost/api/daily-reports', {
      method: 'POST',
      body: JSON.stringify({
        report_date: '2024-11-20',
        status: 'submitted',
        visit_records: [{ customer_id: '', visit_content: '内容', order: 1 }],
      }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    const detail = json.error.details?.find((d: { code: string }) => d.code === 'RE-01')
    expect(detail).toBeDefined()
    expect(detail.field).toContain('visit_records')
  })

  it('API-RPT-033: visit_contentが1001文字の場合400とRE-03が返る', async () => {
    const { POST } = await import('@/app/api/daily-reports/route')
    const req = await makeAuthRequest('http://localhost/api/daily-reports', {
      method: 'POST',
      body: JSON.stringify({
        report_date: '2024-11-20',
        status: 'submitted',
        visit_records: [{ customer_id: 'cust-1', visit_content: 'a'.repeat(1001), order: 1 }],
      }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    const detail = json.error.details?.find((d: { code: string }) => d.code === 'RE-03')
    expect(detail).toBeDefined()
  })

  it('API-RPT-034: problemが2001文字の場合400とRE-07が返る', async () => {
    const { POST } = await import('@/app/api/daily-reports/route')
    const req = await makeAuthRequest('http://localhost/api/daily-reports', {
      method: 'POST',
      body: JSON.stringify({
        report_date: '2024-11-20',
        status: 'draft',
        problem: 'a'.repeat(2001),
      }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    const detail = json.error.details?.find((d: { code: string }) => d.code === 'RE-07')
    expect(detail).toBeDefined()
  })

  it('API-RPT-036: 同一日付で2回POSTすると409とBIZ-002が返る', async () => {
    mockReport.findUnique.mockResolvedValue(sampleReport) // 既存あり

    const { POST } = await import('@/app/api/daily-reports/route')
    const req = await makeAuthRequest('http://localhost/api/daily-reports', {
      method: 'POST',
      body: JSON.stringify({ report_date: '2024-11-20', status: 'draft' }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error.code).toBe('BIZ-002')
  })
})

describe('GET /api/daily-reports/team', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const mockUser = prisma.user as { findMany: ReturnType<typeof vi.fn> }
    mockUser.findMany.mockResolvedValue([{ id: 'user-002' }])
    mockReport.count.mockResolvedValue(0)
    mockReport.findMany.mockResolvedValue([])
  })

  it('API-RPT-012: 営業ロールのトークンでアクセスすると403とSYS-004が返る', async () => {
    const { GET } = await import('@/app/api/daily-reports/team/route')
    const req = await makeAuthRequest('http://localhost/api/daily-reports/team', {}, 'user-001', 'salesperson')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error.code).toBe('SYS-004')
  })

  it('API-RPT-010: 上長ロールで部下の日報一覧が返る', async () => {
    mockReport.findMany.mockResolvedValue([
      {
        ...sampleReport,
        salespersonId: 'user-002',
        salesperson: { id: 'user-002', name: '田中 太郎' },
      },
    ])
    mockReport.count.mockResolvedValue(1)

    const { GET } = await import('@/app/api/daily-reports/team/route')
    const req = await makeAuthRequest('http://localhost/api/daily-reports/team', {}, 'manager-001', 'manager')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(json.data)).toBe(true)
    expect(json.meta).toBeDefined()
  })
})

describe('PATCH /api/daily-reports/[id]/review', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('API-RPT-051: 営業ロールでアクセスすると403が返る', async () => {
    const { PATCH } = await import('@/app/api/daily-reports/[id]/review/route')
    const req = await makeAuthRequest(
      'http://localhost/api/daily-reports/report-001/review',
      { method: 'PATCH' },
      'user-001',
      'salesperson'
    )
    const res = await PATCH(req, { params: Promise.resolve({ id: 'report-001' }) })
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error.code).toBe('SYS-004')
  })

  it('API-RPT-050: 上長ロールで提出済み日報を確認済みに変更できる', async () => {
    mockReport.findUnique.mockResolvedValue({
      ...sampleReport,
      status: 'submitted',
    })
    mockReport.update.mockResolvedValue({
      id: 'report-001',
      status: 'reviewed',
      updatedAt: new Date(),
    })

    const { PATCH } = await import('@/app/api/daily-reports/[id]/review/route')
    const req = await makeAuthRequest(
      'http://localhost/api/daily-reports/report-001/review',
      { method: 'PATCH' },
      'manager-001',
      'manager'
    )
    const res = await PATCH(req, { params: Promise.resolve({ id: 'report-001' }) })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.status).toBe('reviewed')
  })

  it('API-RPT-052: 確認済み日報に対してreviewを実行すると409とBIZ-005が返る', async () => {
    mockReport.findUnique.mockResolvedValue({
      ...sampleReport,
      status: 'reviewed',
    })

    const { PATCH } = await import('@/app/api/daily-reports/[id]/review/route')
    const req = await makeAuthRequest(
      'http://localhost/api/daily-reports/report-001/review',
      { method: 'PATCH' },
      'manager-001',
      'manager'
    )
    const res = await PATCH(req, { params: Promise.resolve({ id: 'report-001' }) })
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error.code).toBe('BIZ-005')
  })
})

describe('訪問記録 API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('API-VIS-001: 下書き日報に訪問記録を追加できる', async () => {
    mockReport.findUnique.mockResolvedValue({
      ...sampleReport,
      status: 'draft',
      salespersonId: 'user-001',
    })

    const mockVisit = prisma.visitRecord as { create: ReturnType<typeof vi.fn> }
    mockVisit.create.mockResolvedValue({
      id: 'visit-001',
      order: 1,
      customer: { id: 'cust-001', name: '株式会社A' },
      visitContent: 'テスト訪問内容',
      visitedAt: '10:00',
      createdAt: new Date(),
    })

    const { POST } = await import('@/app/api/daily-reports/[id]/visit-records/route')
    const req = await makeAuthRequest(
      'http://localhost/api/daily-reports/report-001/visit-records',
      {
        method: 'POST',
        body: JSON.stringify({
          customer_id: 'cust-001',
          visit_content: 'テスト訪問内容',
          visited_at: '10:00',
          order: 1,
        }),
      }
    )
    const res = await POST(req, { params: Promise.resolve({ id: 'report-001' }) })

    expect(res.status).toBe(201)
  })

  it('API-VIS-005: 提出済み日報に訪問記録追加しようとすると403とBIZ-003が返る', async () => {
    mockReport.findUnique.mockResolvedValue({
      ...sampleReport,
      status: 'submitted',
      salespersonId: 'user-001',
    })

    const { POST } = await import('@/app/api/daily-reports/[id]/visit-records/route')
    const req = await makeAuthRequest(
      'http://localhost/api/daily-reports/report-001/visit-records',
      {
        method: 'POST',
        body: JSON.stringify({
          customer_id: 'cust-001',
          visit_content: 'テスト訪問内容',
          order: 1,
        }),
      }
    )
    const res = await POST(req, { params: Promise.resolve({ id: 'report-001' }) })
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error.code).toBe('BIZ-003')
  })
})

