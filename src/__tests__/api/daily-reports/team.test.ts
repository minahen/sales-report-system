import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/daily-reports/team/route'

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

const managerHeaders = {
  'x-user-id': 'manager-001',
  'x-user-role': 'manager',
}

const adminHeaders = {
  'x-user-id': 'admin-001',
  'x-user-role': 'admin',
}

const salespersonHeaders = {
  'x-user-id': 'user-001',
  'x-user-role': 'salesperson',
}

const mockReport = {
  id: 'report-001',
  reportDate: new Date('2024-11-20'),
  status: 'submitted' as const,
  updatedAt: new Date('2024-11-20T10:00:00Z'),
  _count: { visitRecords: 3 },
  salesperson: {
    id: 'user-001',
    name: '田中 太郎',
  },
}

describe('GET /api/daily-reports/team', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('認証チェック', () => {
    it('x-user-id ヘッダーがない場合は401を返す', async () => {
      const request = makeRequest(
        'http://localhost/api/daily-reports/team',
        { 'x-user-role': 'manager' }
      )
      const response = await GET(request)
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error.code).toBe('SYS-003')
    })
  })

  describe('権限チェック', () => {
    it('salesperson ロールは403を返す', async () => {
      const request = makeRequest(
        'http://localhost/api/daily-reports/team',
        salespersonHeaders
      )
      const response = await GET(request)
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error.code).toBe('SYS-004')
    })

    it('manager ロールはアクセス可能', async () => {
      mockPrisma.dailyReport.findMany.mockResolvedValue([mockReport])
      mockPrisma.dailyReport.count.mockResolvedValue(1)

      const request = makeRequest(
        'http://localhost/api/daily-reports/team',
        managerHeaders
      )
      const response = await GET(request)
      expect(response.status).toBe(200)
    })

    it('admin ロールはアクセス可能', async () => {
      mockPrisma.dailyReport.findMany.mockResolvedValue([mockReport])
      mockPrisma.dailyReport.count.mockResolvedValue(1)

      const request = makeRequest(
        'http://localhost/api/daily-reports/team',
        adminHeaders
      )
      const response = await GET(request)
      expect(response.status).toBe(200)
    })
  })

  describe('正常系', () => {
    it('部下の日報一覧を返す（salesperson 情報含む）', async () => {
      mockPrisma.dailyReport.findMany.mockResolvedValue([mockReport])
      mockPrisma.dailyReport.count.mockResolvedValue(1)

      const request = makeRequest(
        'http://localhost/api/daily-reports/team',
        managerHeaders
      )
      const response = await GET(request)
      const body = await response.json()

      expect(body.data).toHaveLength(1)
      expect(body.data[0].id).toBe('report-001')
      expect(body.data[0].report_date).toBe('2024-11-20')
      expect(body.data[0].status).toBe('submitted')
      expect(body.data[0].visit_count).toBe(3)
      expect(body.data[0].salesperson).toEqual({
        id: 'user-001',
        name: '田中 太郎',
      })
      expect(body.data[0].updated_at).toBeDefined()
    })

    it('meta にページネーション情報が含まれる', async () => {
      mockPrisma.dailyReport.findMany.mockResolvedValue([mockReport])
      mockPrisma.dailyReport.count.mockResolvedValue(5)

      const request = makeRequest(
        'http://localhost/api/daily-reports/team',
        managerHeaders
      )
      const response = await GET(request)
      const body = await response.json()

      expect(body.meta.page).toBe(1)
      expect(body.meta.per_page).toBe(20)
      expect(body.meta.total).toBe(5)
    })
  })

  describe('manager の部下フィルタ', () => {
    it('manager は直属の部下の日報のみ取得する（managerId でフィルタ）', async () => {
      mockPrisma.dailyReport.findMany.mockResolvedValue([])
      mockPrisma.dailyReport.count.mockResolvedValue(0)

      const request = makeRequest(
        'http://localhost/api/daily-reports/team',
        managerHeaders
      )
      await GET(request)

      const findManyCall = mockPrisma.dailyReport.findMany.mock.calls[0][0]
      expect(findManyCall.where.salesperson).toEqual({ managerId: 'manager-001' })
    })

    it('admin は全員の日報を取得する（salesperson フィルタなし）', async () => {
      mockPrisma.dailyReport.findMany.mockResolvedValue([])
      mockPrisma.dailyReport.count.mockResolvedValue(0)

      const request = makeRequest(
        'http://localhost/api/daily-reports/team',
        adminHeaders
      )
      await GET(request)

      const findManyCall = mockPrisma.dailyReport.findMany.mock.calls[0][0]
      expect(findManyCall.where.salesperson).toBeUndefined()
    })
  })

  describe('salesperson_id フィルタ', () => {
    it('salesperson_id クエリが指定された場合はさらに絞り込まれる', async () => {
      mockPrisma.dailyReport.findMany.mockResolvedValue([])
      mockPrisma.dailyReport.count.mockResolvedValue(0)

      const salespersonUuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
      const request = makeRequest(
        `http://localhost/api/daily-reports/team?salesperson_id=${salespersonUuid}`,
        managerHeaders
      )
      await GET(request)

      const findManyCall = mockPrisma.dailyReport.findMany.mock.calls[0][0]
      expect(findManyCall.where.salespersonId).toBe(salespersonUuid)
    })

    it('salesperson_id が UUID 形式でない場合は400を返す', async () => {
      const request = makeRequest(
        'http://localhost/api/daily-reports/team?salesperson_id=invalid-id',
        managerHeaders
      )
      const response = await GET(request)
      expect(response.status).toBe(400)
    })
  })

  describe('status フィルタ', () => {
    it('status=submitted で絞り込まれる', async () => {
      mockPrisma.dailyReport.findMany.mockResolvedValue([])
      mockPrisma.dailyReport.count.mockResolvedValue(0)

      const request = makeRequest(
        'http://localhost/api/daily-reports/team?status=submitted',
        managerHeaders
      )
      await GET(request)

      const findManyCall = mockPrisma.dailyReport.findMany.mock.calls[0][0]
      expect(findManyCall.where.status).toBe('submitted')
    })
  })

  describe('year_month フィルタ', () => {
    it('year_month=2024-11 で月の範囲でフィルタリングされる', async () => {
      mockPrisma.dailyReport.findMany.mockResolvedValue([])
      mockPrisma.dailyReport.count.mockResolvedValue(0)

      const request = makeRequest(
        'http://localhost/api/daily-reports/team?year_month=2024-11',
        managerHeaders
      )
      await GET(request)

      const findManyCall = mockPrisma.dailyReport.findMany.mock.calls[0][0]
      expect(findManyCall.where.reportDate).toBeDefined()
      expect(findManyCall.where.reportDate.gte).toEqual(new Date(2024, 10, 1))
      expect(findManyCall.where.reportDate.lt).toEqual(new Date(2024, 11, 1))
    })
  })

  describe('ページネーション', () => {
    it('page=2, per_page=5 の場合は skip=5', async () => {
      mockPrisma.dailyReport.findMany.mockResolvedValue([])
      mockPrisma.dailyReport.count.mockResolvedValue(12)

      const request = makeRequest(
        'http://localhost/api/daily-reports/team?page=2&per_page=5',
        managerHeaders
      )
      const response = await GET(request)
      const body = await response.json()

      const findManyCall = mockPrisma.dailyReport.findMany.mock.calls[0][0]
      expect(findManyCall.skip).toBe(5)
      expect(findManyCall.take).toBe(5)
      expect(body.meta.page).toBe(2)
      expect(body.meta.per_page).toBe(5)
      expect(body.meta.total).toBe(12)
    })
  })
})
