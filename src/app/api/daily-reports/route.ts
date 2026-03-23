// GET /api/daily-reports  — 日報一覧（自分）
// POST /api/daily-reports — 日報作成
// 実装は Issue #6 (API-01)、Issue #7 (API-02) で行う
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestUser } from '@/lib/request'
import { listQuerySchema } from '@/lib/validations/daily-report'

export async function GET(request: NextRequest) {
  const user = getRequestUser(request)
  if (!user) {
    return Response.json(
      { error: { code: 'SYS-003', message: 'セッションが切れました。再度ログインしてください。' } },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const queryResult = listQuerySchema.safeParse({
    status: searchParams.get('status') ?? undefined,
    year_month: searchParams.get('year_month') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    per_page: searchParams.get('per_page') ?? undefined,
  })

  if (!queryResult.success) {
    return Response.json(
      { error: { code: 'VAL-001', message: 'クエリパラメーターが不正です' } },
      { status: 400 }
    )
  }

  const { status, year_month, page, per_page } = queryResult.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    salespersonId: user.id,
  }

  if (status) {
    where.status = status
  }

  if (year_month) {
    const [year, month] = year_month.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 1)
    where.reportDate = {
      gte: startDate,
      lt: endDate,
    }
  }

  const skip = (page - 1) * per_page
  const [reports, total] = await Promise.all([
    prisma.dailyReport.findMany({
      where,
      orderBy: { reportDate: 'desc' },
      skip,
      take: per_page,
      include: {
        _count: {
          select: { visitRecords: true },
        },
      },
    }),
    prisma.dailyReport.count({ where }),
  ])

  const data = reports.map((report) => ({
    id: report.id,
    report_date: report.reportDate.toISOString().slice(0, 10),
    status: report.status,
    visit_count: report._count.visitRecords,
    updated_at: report.updatedAt.toISOString(),
  }))

  return Response.json({
    data,
    meta: {
      page,
      per_page,
      total,
    },
  })
}

export async function POST() {
  return Response.json({ message: 'Not implemented' }, { status: 501 })
}
