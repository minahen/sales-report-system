import type { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/request-context'
import { isManager, forbiddenResponse } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import type { ReportStatus } from '@/types'

// GET /api/daily-reports/team — 部下全員の日報一覧
export async function GET(req: NextRequest) {
  const user = getAuthUser(req)

  if (!isManager(user.role)) {
    return forbiddenResponse()
  }

  const { searchParams } = req.nextUrl
  const salespersonId = searchParams.get('salesperson_id')
  const status = searchParams.get('status') as ReportStatus | null
  const yearMonth = searchParams.get('year_month')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') ?? '20', 10)))

  // 部下のIDを取得（manager_id = ログインユーザーID）
  const subordinates = await prisma.user.findMany({
    where: { managerId: user.id, deletedAt: null },
    select: { id: true },
  })
  const subordinateIds = subordinates.map((s) => s.id)

  const where: Record<string, unknown> = {
    salespersonId: salespersonId
      ? salespersonId
      : { in: subordinateIds },
  }

  // salesperson_idが指定されている場合も部下に限定
  if (salespersonId && !subordinateIds.includes(salespersonId)) {
    // 自分の部下でない担当者は返さない（空返却）
    return Response.json({
      data: [],
      meta: { page, per_page: perPage, total: 0 },
    })
  }

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
      include: {
        salesperson: { select: { id: true, name: true } },
        _count: { select: { visitRecords: true } },
      },
    }),
  ])

  const data = reports.map((r) => ({
    id: r.id,
    report_date: r.reportDate.toISOString().split('T')[0],
    status: r.status,
    visit_count: r._count.visitRecords,
    salesperson: r.salesperson,
    updated_at: r.updatedAt.toISOString(),
  }))

  return Response.json({
    data,
    meta: { page, per_page: perPage, total },
  })
}
