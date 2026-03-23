import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/daily-reports/route'

// Prisma をモック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    dailyReport: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

const mockPrisma = prisma as {
  dailyReport: {
    findMany: ReturnType<typeof vi.fn>
    count: ReturnType<typeof vi.fn>
  }
}

function makeRequest(
  url: string,
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest(url, { headers })
}

const authHeaders = {
  'x-user-id': 'user-001',
  'x-user-role': 'salesperson',
}

const mockReport = {
  id: 'report-001',
  reportDate: new Date('2024-11-20'),
  status: 'draft' as const,
  updatedAt: new Date('2024-11-20T10:00:00Z'),
  _count: { visitRecords: 2 },
}

describe('GET /api/daily-reports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('認証チェック', () => {
    it('x-user-id ヘッダーがない場合は401を返す', async () => {
      const request = makeRequest('http://localhost/api/daily-reports', {
        'x-user-role': 'salesperson',
      })
      const response = await GET(request)
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error.code).toBe('SYS-003')
    })

    it('x-user-role ヘッダーがない場合は401を返す', async () => {
      const request = makeRequest('http://localhost/api/daily-reports', {
        'x-user-id': 'user-001',
      })
      const response = await GET(request)
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error.code).toBe('SYS-003')
    })
  })

  describe('正常系', () => {
    it('自分の日報一覧を返す', async () => {
      mockPrisma.dailyReport.findMany.mockResolvedValue([mockReport])
      mockPrisma.dailyReport.count.mockResolvedValue(1)

      const request = makeRequest(
        'http://localhost/api/daily-reports',
        authHeaders
      )
      const response = await GET(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.data).toHaveLength(1)
      expect(body.data[0].id).toBe('report-001')
      expect(body.data[0].report_date).toBe('2024-11-20')
      expect(body.data[0].status).toBe('draft')
      expect(body.data[0].visit_count).toBe(2)
      expect(body.data[0].updated_at).toBe('2024-11-20T10:00:00.000Z')
      expect(body.meta.page).toBe(1)
      expect(body.meta.per_page).toBe(20)
      expect(body.meta.total).toBe(1)
    })

    it('salespersonId でフィルタリングされる（自分の日報のみ）', async () => {
      mockPrisma.dailyReport.findMany.mockResolvedValue([])
      mockPrisma.dailyReport.count.mockResolvedValue(0)

      const request = makeRequest(
        'http://localhost/api/daily-reports',
        authHeaders
      )
      await GET(request)

      const findManyCall = mockPrisma.dailyReport.findMany.mock.calls[0][0]
      expect(findManyCall.where.salespersonId).toBe('user-001')
    })

    it('日付降順でソートされる', async () => {
      mockPrisma.dailyReport.findMany.mockResolvedValue([])
      mockPrisma.dailyReport.count.mockResolvedValue(0)

      const request = makeRequest(
        'http://localhost/api/daily-reports',
        authHeaders
      )
      await GET(request)

      const findManyCall = mockPrisma.dailyReport.findMany.mock.calls[0][0]
      expect(findManyCall.orderBy).toEqual({ reportDate: 'desc' })
    })

    it('複数件の日報を返す', async () => {
      const reports = [
        { ...mockReport, id: 'report-001', reportDate: new Date('2024-11-20') },
        {
          ...mockReport,
          id: 'report-002',
          reportDate: new Date('2024-11-19'),
          status: 'submitted' as const,
        },
      ]
      mockPrisma.dailyReport.findMany.mockResolvedValue(reports)
      mockPrisma.dailyReport.count.mockResolvedValue(2)

      const request = makeRequest(
        'http://localhost/api/daily-reports',
        authHeaders
      )
      const response = await GET(request)
      const body = await response.json()
      expect(body.data).toHaveLength(2)
      expect(body.meta.total).toBe(2)
    })
  })

  describe('status フィルタ', () => {
    it('status=submitted で絞り込まれる', async () => {
      mockPrisma.dailyReport.findMany.mockResolvedValue([])
      mockPrisma.dailyReport.count.mockResolvedValue(0)

      const request = makeRequest(
        'http://localhost/api/daily-reports?status=submitted',
        authHeaders
      )
      await GET(request)

      const findManyCall = mockPrisma.dailyReport.findMany.mock.calls[0][0]
      expect(findManyCall.where.status).toBe('submitted')
    })

    it('status=draft で絞り込まれる', async () => {
      mockPrisma.dailyReport.findMany.mockResolvedValue([])
      mockPrisma.dailyReport.count.mockResolvedValue(0)

      const request = makeRequest(
        'http://localhost/api/daily-reports?status=draft',
        authHeaders
      )
      await GET(request)

      const findManyCall = mockPrisma.dailyReport.findMany.mock.calls[0][0]
      expect(findManyCall.where.status).toBe('draft')
    })

    it('status=reviewed で絞り込まれる', async () => {
      mockPrisma.dailyReport.findMany.mockResolvedValue([])
      mockPrisma.dailyReport.count.mockResolvedValue(0)

      const request = makeRequest(
        'http://localhost/api/daily-reports?status=reviewed',
        authHeaders
      )
      await GET(request)

      const findManyCall = mockPrisma.dailyReport.findMany.mock.calls[0][0]
      expect(findManyCall.where.status).toBe('reviewed')
    })

    it('status が指定されていない場合は where に status が含まれない', async () => {
      mockPrisma.dailyReport.findMany.mockResolvedValue([])
      mockPrisma.dailyReport.count.mockResolvedValue(0)

      const request = makeRequest(
        'http://localhost/api/daily-reports',
        authHeaders
      )
      await GET(request)

      const findManyCall = mockPrisma.dailyReport.findMany.mock.calls[0][0]
      expect(findManyCall.where.status).toBeUndefined()
    })
  })

  describe('year_month フィルタ', () => {
    it('year_month=2024-11 で月の範囲でフィルタリングされる', async () => {
      mockPrisma.dailyReport.findMany.mockResolvedValue([])
      mockPrisma.dailyReport.count.mockResolvedValue(0)

      const request = makeRequest(
        'http://localhost/api/daily-reports?year_month=2024-11',
        authHeaders
      )
      await GET(request)

      const findManyCall = mockPrisma.dailyReport.findMany.mock.calls[0][0]
      expect(findManyCall.where.reportDate).toBeDefined()
      expect(findManyCall.where.reportDate.gte).toEqual(new Date(2024, 10, 1))
      expect(findManyCall.where.reportDate.lt).toEqual(new Date(2024, 11, 1))
    })

    it('year_month が指定されていない場合は reportDate フィルタが含まれない', async () => {
      mockPrisma.dailyReport.findMany.mockResolvedValue([])
      mockPrisma.dailyReport.count.mockResolvedValue(0)

      const request = makeRequest(
        'http://localhost/api/daily-reports',
        authHeaders
      )
      await GET(request)

      const findManyCall = mockPrisma.dailyReport.findMany.mock.calls[0][0]
      expect(findManyCall.where.reportDate).toBeUndefined()
    })
  })

  describe('ページネーション', () => {
    it('デフォルトは page=1, per_page=20', async () => {
      mockPrisma.dailyReport.findMany.mockResolvedValue([])
      mockPrisma.dailyReport.count.mockResolvedValue(0)

      const request = makeRequest(
        'http://localhost/api/daily-reports',
        authHeaders
      )
      await GET(request)

      const findManyCall = mockPrisma.dailyReport.findMany.mock.calls[0][0]
      expect(findManyCall.skip).toBe(0)
      expect(findManyCall.take).toBe(20)
    })

    it('page=2, per_page=10 の場合は skip=10', async () => {
      mockPrisma.dailyReport.findMany.mockResolvedValue([])
      mockPrisma.dailyReport.count.mockResolvedValue(25)

      const request = makeRequest(
        'http://localhost/api/daily-reports?page=2&per_page=10',
        authHeaders
      )
      const response = await GET(request)
      const body = await response.json()

      const findManyCall = mockPrisma.dailyReport.findMany.mock.calls[0][0]
      expect(findManyCall.skip).toBe(10)
      expect(findManyCall.take).toBe(10)
      expect(body.meta.page).toBe(2)
      expect(body.meta.per_page).toBe(10)
      expect(body.meta.total).toBe(25)
    })

    it('per_page が 100 を超える場合は400を返す', async () => {
      const request = makeRequest(
        'http://localhost/api/daily-reports?per_page=101',
        authHeaders
      )
      const response = await GET(request)
      expect(response.status).toBe(400)
    })
  })
})
