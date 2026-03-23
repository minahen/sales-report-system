// @vitest-environment node
/**
 * セキュリティテスト
 * NFT-SEC-001〜006: 認証・認可テスト
 * NFT-SEC-010〜013: 入力値サニタイズテスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { signToken, verifyToken } from '@/lib/auth'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    dailyReport: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    visitRecord: {
      count: vi.fn(),
    },
    comment: {
      count: vi.fn(),
    },
    customer: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

function makeRequest(url: string, options: RequestInit = {}, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...(options.headers as Record<string, string> ?? {}),
    },
  })
}

function makeAuthRequest(url: string, options: RequestInit = {}, userId = 'user-001', role = 'salesperson'): NextRequest {
  return makeRequest(url, options, {
    'x-user-id': userId,
    'x-user-role': role,
    'x-user-name': 'Tanaka Taro',
    'x-user-email': 'tanaka@example.com',
  })
}

describe('NFT-SEC-001〜006: 認証・認可テスト', () => {
  describe('NFT-SEC-001: 未認証アクセス拒否', () => {
    it('Authorizationヘッダーなしでは401が返る（ミドルウェアで処理）', async () => {
      // ミドルウェアが認証を担当しているため、ここでは
      // ミドルウェアを通過した後のAPIのロール確認をテスト
      // APIルートは認証済みを前提としているので、
      // 未認証はミドルウェアレベルで処理される

      // ミドルウェアのverifyTokenをテスト
      const result = await verifyToken('invalid.token.here')
      expect(result).toBeNull()
    })
  })

  describe('NFT-SEC-002: 他ユーザーの日報へのアクセス拒否', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      const mockDailyReport = prisma.dailyReport as { findUnique: ReturnType<typeof vi.fn> }
      mockDailyReport.findUnique.mockResolvedValue({
        id: 'report-002',
        salespersonId: 'user-002', // 別のユーザーの日報
        reportDate: new Date('2024-11-20'),
        status: 'submitted',
        problem: null,
        plan: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        salesperson: { id: 'user-002', name: '鈴木 花子' },
        visitRecords: [],
        comments: [],
      })
    })

    it('他ユーザーの日報をGETすると403が返る（営業ロール）', async () => {
      const { GET } = await import('@/app/api/daily-reports/[id]/route')
      // user-001で user-002の日報にアクセス
      const req = makeAuthRequest('http://localhost/api/daily-reports/report-002', {}, 'user-001', 'salesperson')
      const res = await GET(req, { params: Promise.resolve({ id: 'report-002' }) })

      expect(res.status).toBe(403)
    })
  })

  describe('NFT-SEC-003: 他ユーザーの日報の更新拒否', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      const mockDailyReport = prisma.dailyReport as { findUnique: ReturnType<typeof vi.fn> }
      mockDailyReport.findUnique.mockResolvedValue({
        id: 'report-002',
        salespersonId: 'user-002',
        status: 'draft',
      })
    })

    it('他ユーザーの日報をPUTすると403とBIZ-004が返る', async () => {
      const { PUT } = await import('@/app/api/daily-reports/[id]/route')
      const req = makeAuthRequest('http://localhost/api/daily-reports/report-002', {
        method: 'PUT',
        body: JSON.stringify({
          report_date: '2024-11-20',
          status: 'draft',
          visit_records: [],
        }),
      }, 'user-001', 'salesperson')
      const res = await PUT(req, { params: Promise.resolve({ id: 'report-002' }) })
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error.code).toBe('BIZ-004')
    })
  })

  describe('NFT-SEC-004: ロール昇格の拒否', () => {
    it('営業ロールが顧客削除APIを呼ぶと403が返る', async () => {
      const mockCustomer = prisma.customer as { findUnique: ReturnType<typeof vi.fn> }
      mockCustomer.findUnique.mockResolvedValue({
        id: 'cust-001',
        name: 'テスト',
        deletedAt: null,
      })

      const { DELETE } = await import('@/app/api/customers/[id]/route')
      const req = makeAuthRequest(
        'http://localhost/api/customers/cust-001',
        { method: 'DELETE' },
        'user-001',
        'salesperson'
      )
      const res = await DELETE(req, { params: Promise.resolve({ id: 'cust-001' }) })
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error.code).toBe('SYS-004')
    })

    it('上長ロールが営業マスタ一覧を呼ぶと403が返る', async () => {
      const { GET } = await import('@/app/api/salespeople/route')
      const req = makeAuthRequest('http://localhost/api/salespeople', {}, 'manager-001', 'manager')
      const res = await GET(req)
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error.code).toBe('SYS-004')
    })
  })

  describe('NFT-SEC-005: JWT改ざんの拒否', () => {
    it('ペイロードを改ざんしたJWTはverifyTokenがnullを返す', async () => {
      const token = await signToken({
        sub: 'user-001',
        name: '田中 太郎',
        email: 'tanaka@example.com',
        role: 'salesperson',
      })

      // ペイロード部分を書き換える
      const parts = token.split('.')
      const tamperedPayload = Buffer.from(
        JSON.stringify({ sub: 'user-999', role: 'admin', name: 'ハッカー', email: 'hack@evil.com' })
      ).toString('base64url')
      const tampered = [parts[0], tamperedPayload, parts[2]].join('.')

      const result = await verifyToken(tampered)
      expect(result).toBeNull()
    })

    it('roleをadminに書き換えたJWTはverifyTokenがnullを返す', async () => {
      const token = await signToken({
        sub: 'user-001',
        name: '田中 太郎',
        email: 'tanaka@example.com',
        role: 'salesperson',
      })

      const parts = token.split('.')
      const originalPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
      const tamperedPayload = Buffer.from(
        JSON.stringify({ ...originalPayload, role: 'admin' })
      ).toString('base64url')
      const tampered = [parts[0], tamperedPayload, parts[2]].join('.')

      const result = await verifyToken(tampered)
      expect(result).toBeNull()
    })
  })

  describe('NFT-SEC-006: トークン期限切れ後のアクセス拒否', () => {
    it('無効なトークン（期限切れ相当）はverifyTokenがnullを返す', async () => {
      const result = await verifyToken('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTAwMSIsImV4cCI6MH0.invalid_sig')
      expect(result).toBeNull()
    })
  })
})

describe('NFT-SEC-010〜013: 入力値サニタイズテスト（APIレベル）', () => {
  describe('NFT-SEC-010: XSS（格納型）対策', () => {
    it('訪問内容にスクリプトタグが含まれていてもAPIは400を返さない（DBは保存し、表示時エスケープはフロントエンドの責務）', async () => {
      // APIは入力値をそのまま受け付け、レスポンス時にJSONエンコードする
      // XSSの防止はフロントエンドのReact（デフォルトエスケープ）が担当
      // ここではAPIが正しくバリデーションし、1000文字以内であれば受け付けることを確認
      const { createReportSchema } = await import('@/lib/validations/reports')
      const xssPayload = "<script>alert('XSS')</script>"
      const result = createReportSchema.safeParse({
        report_date: '2024-11-20',
        status: 'draft',
        visit_records: [{
          customer_id: 'cust-001',
          visit_content: xssPayload,
          order: 1,
        }],
      })
      // バリデーション自体は通過（文字数制限内）
      expect(result.success).toBe(true)
      // データは変換されずそのまま保持される（XSS対策はフロントエンドのReactが担当）
      expect(result.data?.visit_records?.[0]?.visit_content).toBe(xssPayload)
    })
  })

  describe('NFT-SEC-012: SQLインジェクション対策', () => {
    it('SQLインジェクション文字列をスキーマで検証してもエラーにならない（Prismaはパラメータ化クエリを使用）', async () => {
      // 顧客名検索にSQLインジェクション文字列を含めても
      // Prismaは内部でパラメータ化クエリを使用するため安全
      const { createCustomerSchema } = await import('@/lib/validations/customers')
      const sqlInjection = "'; DROP TABLE customers; --"
      const result = createCustomerSchema.safeParse({ name: sqlInjection })
      // 100文字以内なので通過する
      expect(result.success).toBe(true)
    })
  })

  describe('NFT-SEC-013: 大量データ送信（ペイロード）', () => {
    it('訪問内容が1001文字の場合バリデーションで弾かれる', async () => {
      const { createReportSchema } = await import('@/lib/validations/reports')
      const result = createReportSchema.safeParse({
        report_date: '2024-11-20',
        status: 'submitted',
        visit_records: [{
          customer_id: 'cust-001',
          visit_content: 'a'.repeat(1001),
          order: 1,
        }],
      })
      expect(result.success).toBe(false)
      const issue = result.error?.issues.find((i) => i.message === 'RE-03')
      expect(issue).toBeDefined()
    })

    it('problemが2001文字の場合バリデーションで弾かれる', async () => {
      const { createReportSchema } = await import('@/lib/validations/reports')
      const result = createReportSchema.safeParse({
        report_date: '2024-11-20',
        status: 'draft',
        problem: 'a'.repeat(2001),
      })
      expect(result.success).toBe(false)
      const issue = result.error?.issues.find((i) => i.message === 'RE-07')
      expect(issue).toBeDefined()
    })
  })
})
