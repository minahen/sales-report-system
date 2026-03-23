import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/daily-reports/[id]/route'

// Prisma をモック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    dailyReport: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

const mockPrisma = prisma as {
  dailyReport: {
    findUnique: ReturnType<typeof vi.fn>
  }
}

function makeRequest(
  url: string,
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest(url, { headers })
}

const reportId = 'report-001'
const params = Promise.resolve({ id: reportId })

const salespersonHeaders = {
  'x-user-id': 'user-001',
  'x-user-role': 'salesperson',
}

const managerHeaders = {
  'x-user-id': 'manager-001',
  'x-user-role': 'manager',
}

const adminHeaders = {
  'x-user-id': 'admin-001',
  'x-user-role': 'admin',
}

const mockReportFull = {
  id: reportId,
  salespersonId: 'user-001',
  reportDate: new Date('2024-11-20'),
  status: 'submitted' as const,
  problem: '課題テキスト',
  plan: '計画テキスト',
  createdAt: new Date('2024-11-20T08:00:00Z'),
  updatedAt: new Date('2024-11-20T10:00:00Z'),
  salesperson: {
    id: 'user-001',
    name: '田中 太郎',
    managerId: 'manager-001',
  },
  visitRecords: [
    {
      id: 'visit-001',
      order: 1,
      visitContent: '訪問内容',
      visitedAt: '10:00',
      customer: {
        id: 'cust-001',
        name: '株式会社A',
      },
    },
  ],
  comments: [
    {
      id: 'comment-001',
      content: 'コメント内容',
      createdAt: new Date('2024-11-20T11:00:00Z'),
      updatedAt: new Date('2024-11-20T11:00:00Z'),
      commenter: {
        id: 'manager-001',
        name: '山田 部長',
      },
    },
  ],
}

describe('GET /api/daily-reports/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('認証チェック', () => {
    it('認証ヘッダーがない場合は401を返す', async () => {
      const request = makeRequest(`http://localhost/api/daily-reports/${reportId}`)
      const response = await GET(request, { params })
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error.code).toBe('SYS-003')
    })
  })

  describe('存在チェック', () => {
    it('存在しない日報IDの場合は404を返す', async () => {
      mockPrisma.dailyReport.findUnique.mockResolvedValue(null)

      const request = makeRequest(
        `http://localhost/api/daily-reports/${reportId}`,
        salespersonHeaders
      )
      const response = await GET(request, { params })
      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error.code).toBe('SYS-005')
      expect(body.error.message).toBe('対象データが見つかりません')
    })
  })

  describe('権限チェック', () => {
    it('salesperson が自分の日報を取得できる', async () => {
      mockPrisma.dailyReport.findUnique.mockResolvedValue(mockReportFull)

      const request = makeRequest(
        `http://localhost/api/daily-reports/${reportId}`,
        salespersonHeaders
      )
      const response = await GET(request, { params })
      expect(response.status).toBe(200)
    })

    it('salesperson が他者の日報にアクセスすると403を返す', async () => {
      mockPrisma.dailyReport.findUnique.mockResolvedValue({
        ...mockReportFull,
        salespersonId: 'other-user',
      })

      const request = makeRequest(
        `http://localhost/api/daily-reports/${reportId}`,
        salespersonHeaders
      )
      const response = await GET(request, { params })
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error.code).toBe('SYS-004')
    })

    it('manager が直属の部下の日報を取得できる', async () => {
      mockPrisma.dailyReport.findUnique.mockResolvedValue(mockReportFull)
      // mockReportFull.salesperson.managerId = 'manager-001' と一致

      const request = makeRequest(
        `http://localhost/api/daily-reports/${reportId}`,
        managerHeaders
      )
      const response = await GET(request, { params })
      expect(response.status).toBe(200)
    })

    it('manager が直属でない部下の日報にアクセスすると403を返す', async () => {
      mockPrisma.dailyReport.findUnique.mockResolvedValue({
        ...mockReportFull,
        salespersonId: 'other-user',
        salesperson: {
          ...mockReportFull.salesperson,
          id: 'other-user',
          managerId: 'other-manager',
        },
      })

      const request = makeRequest(
        `http://localhost/api/daily-reports/${reportId}`,
        managerHeaders
      )
      const response = await GET(request, { params })
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error.code).toBe('SYS-004')
    })

    it('admin は誰の日報でも取得できる', async () => {
      mockPrisma.dailyReport.findUnique.mockResolvedValue({
        ...mockReportFull,
        salespersonId: 'any-user',
        salesperson: {
          ...mockReportFull.salesperson,
          id: 'any-user',
          managerId: 'some-manager',
        },
      })

      const request = makeRequest(
        `http://localhost/api/daily-reports/${reportId}`,
        adminHeaders
      )
      const response = await GET(request, { params })
      expect(response.status).toBe(200)
    })
  })

  describe('正常系: レスポンス構造', () => {
    it('日報詳細の全フィールドが正しく返る', async () => {
      mockPrisma.dailyReport.findUnique.mockResolvedValue(mockReportFull)

      const request = makeRequest(
        `http://localhost/api/daily-reports/${reportId}`,
        salespersonHeaders
      )
      const response = await GET(request, { params })
      const body = await response.json()

      expect(body.data.id).toBe(reportId)
      expect(body.data.report_date).toBe('2024-11-20')
      expect(body.data.status).toBe('submitted')
      expect(body.data.problem).toBe('課題テキスト')
      expect(body.data.plan).toBe('計画テキスト')
      expect(body.data.created_at).toBe('2024-11-20T08:00:00.000Z')
      expect(body.data.updated_at).toBe('2024-11-20T10:00:00.000Z')
    })

    it('salesperson フィールドが含まれる', async () => {
      mockPrisma.dailyReport.findUnique.mockResolvedValue(mockReportFull)

      const request = makeRequest(
        `http://localhost/api/daily-reports/${reportId}`,
        salespersonHeaders
      )
      const response = await GET(request, { params })
      const body = await response.json()

      expect(body.data.salesperson).toEqual({
        id: 'user-001',
        name: '田中 太郎',
      })
    })

    it('visit_records が order 順で返る', async () => {
      const reportWithMultipleVisits = {
        ...mockReportFull,
        visitRecords: [
          {
            id: 'visit-002',
            order: 2,
            visitContent: '訪問内容2',
            visitedAt: '14:00',
            customer: { id: 'cust-002', name: '株式会社B' },
          },
          {
            id: 'visit-001',
            order: 1,
            visitContent: '訪問内容1',
            visitedAt: '10:00',
            customer: { id: 'cust-001', name: '株式会社A' },
          },
        ],
      }
      mockPrisma.dailyReport.findUnique.mockResolvedValue(reportWithMultipleVisits)

      const request = makeRequest(
        `http://localhost/api/daily-reports/${reportId}`,
        salespersonHeaders
      )
      const response = await GET(request, { params })
      const body = await response.json()

      expect(body.data.visit_records).toHaveLength(2)
      // Prisma の orderBy で order: 'asc' が指定されているため、モックの返却順通り
      expect(body.data.visit_records[0].id).toBe('visit-002')
      expect(body.data.visit_records[0].order).toBe(2)
      expect(body.data.visit_records[0].visit_content).toBe('訪問内容2')
      expect(body.data.visit_records[0].visited_at).toBe('14:00')
      expect(body.data.visit_records[0].customer).toEqual({
        id: 'cust-002',
        name: '株式会社B',
      })
    })

    it('comments フィールドが投稿者情報とともに返る', async () => {
      mockPrisma.dailyReport.findUnique.mockResolvedValue(mockReportFull)

      const request = makeRequest(
        `http://localhost/api/daily-reports/${reportId}`,
        salespersonHeaders
      )
      const response = await GET(request, { params })
      const body = await response.json()

      expect(body.data.comments).toHaveLength(1)
      expect(body.data.comments[0].id).toBe('comment-001')
      expect(body.data.comments[0].content).toBe('コメント内容')
      expect(body.data.comments[0].commenter).toEqual({
        id: 'manager-001',
        name: '山田 部長',
      })
      expect(body.data.comments[0].created_at).toBe('2024-11-20T11:00:00.000Z')
      expect(body.data.comments[0].updated_at).toBe('2024-11-20T11:00:00.000Z')
    })

    it('訪問記録やコメントがない場合は空配列を返す', async () => {
      mockPrisma.dailyReport.findUnique.mockResolvedValue({
        ...mockReportFull,
        visitRecords: [],
        comments: [],
      })

      const request = makeRequest(
        `http://localhost/api/daily-reports/${reportId}`,
        salespersonHeaders
      )
      const response = await GET(request, { params })
      const body = await response.json()

      expect(body.data.visit_records).toEqual([])
      expect(body.data.comments).toEqual([])
    })

    it('problem と plan が null の場合も正常に返る', async () => {
      mockPrisma.dailyReport.findUnique.mockResolvedValue({
        ...mockReportFull,
        problem: null,
        plan: null,
      })

      const request = makeRequest(
        `http://localhost/api/daily-reports/${reportId}`,
        salespersonHeaders
      )
      const response = await GET(request, { params })
      const body = await response.json()

      expect(body.data.problem).toBeNull()
      expect(body.data.plan).toBeNull()
    })
  })
})
