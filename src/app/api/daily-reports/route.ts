import type { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/request-context'
import { prisma } from '@/lib/prisma'
import { createReportSchema } from '@/lib/validations/reports'
import { validationErrorResponse, conflictResponse } from '@/lib/api-errors'
import type { ReportStatus } from '@/types'

// GET /api/daily-reports — 日報一覧（自分）
export async function GET(req: NextRequest) {
  const user = getAuthUser(req)
  const { searchParams } = req.nextUrl

  const status = searchParams.get('status') as ReportStatus | null
  const yearMonth = searchParams.get('year_month') // YYYY-MM
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') ?? '20', 10)))

  const where: Record<string, unknown> = { salespersonId: user.id }
  if (status) {
    where.status = status
  }
  if (yearMonth && /^\d{4}-\d{2}$/.test(yearMonth)) {
    const [year, month] = yearMonth.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 1)
    where.reportDate = { gte: startDate, lt: endDate }
  }

  const [total, reports] = await Promise.all([
    prisma.dailyReport.count({ where }),
    prisma.dailyReport.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: { reportDate: 'desc' },
      include: { _count: { select: { visitRecords: true } } },
    }),
  ])

  const data = reports.map((r) => ({
    id: r.id,
    report_date: r.reportDate.toISOString().split('T')[0],
    status: r.status,
    visit_count: r._count.visitRecords,
    updated_at: r.updatedAt.toISOString(),
  }))

  return Response.json({
    data,
    meta: { page, per_page: perPage, total },
  })
}

// POST /api/daily-reports — 日報作成
export async function POST(req: NextRequest) {
  const user = getAuthUser(req)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json(
      { error: { code: 'SYS-002', message: 'リクエストの形式が正しくありません' } },
      { status: 400 }
    )
  }

  const result = createReportSchema.safeParse(body)
  if (!result.success) {
    return validationErrorResponse(result.error.issues)
  }

  const { report_date, status, problem, plan, visit_records } = result.data

  // 重複チェック
  const existing = await prisma.dailyReport.findUnique({
    where: {
      salespersonId_reportDate: {
        salespersonId: user.id,
        reportDate: new Date(report_date),
      },
    },
  })
  if (existing) {
    return conflictResponse('BIZ-002', '同じ日付の日報がすでに存在します')
  }

  const report = await prisma.dailyReport.create({
    data: {
      salespersonId: user.id,
      reportDate: new Date(report_date),
      status,
      problem: problem ?? null,
      plan: plan ?? null,
      visitRecords: {
        createMany: {
          data: visit_records.map((vr) => ({
            customerId: vr.customer_id,
            visitContent: vr.visit_content,
            visitedAt: vr.visited_at ?? null,
            order: vr.order,
          })),
        },
      },
    },
    include: {
      salesperson: { select: { id: true, name: true } },
      visitRecords: {
        include: { customer: { select: { id: true, name: true } } },
        orderBy: { order: 'asc' },
      },
      comments: {
        include: { commenter: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  return Response.json({ data: formatReport(report) }, { status: 201 })
}

function formatReport(report: {
  id: string
  reportDate: Date
  status: string
  problem: string | null
  plan: string | null
  createdAt: Date
  updatedAt: Date
  salesperson: { id: string; name: string }
  visitRecords: Array<{
    id: string
    order: number
    customer: { id: string; name: string }
    visitContent: string
    visitedAt: string | null
    createdAt: Date
  }>
  comments: Array<{
    id: string
    content: string
    commenter: { id: string; name: string }
    createdAt: Date
    updatedAt: Date
  }>
}) {
  return {
    id: report.id,
    report_date: report.reportDate.toISOString().split('T')[0],
    status: report.status,
    problem: report.problem,
    plan: report.plan,
    salesperson: report.salesperson,
    visit_records: report.visitRecords.map((vr) => ({
      id: vr.id,
      order: vr.order,
      customer: vr.customer,
      visit_content: vr.visitContent,
      visited_at: vr.visitedAt,
      created_at: vr.createdAt.toISOString(),
    })),
    comments: report.comments.map((c) => ({
      id: c.id,
      content: c.content,
      commenter: c.commenter,
      created_at: c.createdAt.toISOString(),
      updated_at: c.updatedAt.toISOString(),
    })),
    created_at: report.createdAt.toISOString(),
    updated_at: report.updatedAt.toISOString(),
  }
}
