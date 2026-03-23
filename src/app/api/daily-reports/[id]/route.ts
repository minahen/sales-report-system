import type { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/request-context'
import { prisma } from '@/lib/prisma'
import { updateReportSchema } from '@/lib/validations/reports'
import { validationErrorResponse, notFoundResponse } from '@/lib/api-errors'
import { isManager, forbiddenResponse } from '@/lib/rbac'

const reportInclude = {
  salesperson: { select: { id: true, name: true } },
  visitRecords: {
    include: { customer: { select: { id: true, name: true } } },
    orderBy: { order: 'asc' as const },
  },
  comments: {
    include: { commenter: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
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

// GET /api/daily-reports/[id] — 日報詳細
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(req)
  const { id } = await params

  const report = await prisma.dailyReport.findUnique({
    where: { id },
    include: reportInclude,
  })

  if (!report) {
    return notFoundResponse()
  }

  // 自分の日報か、上長/管理者のみアクセス可
  if (report.salespersonId !== user.id && !isManager(user.role)) {
    return forbiddenResponse()
  }

  return Response.json({ data: formatReport(report) })
}

// PUT /api/daily-reports/[id] — 日報更新
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(req)
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json(
      { error: { code: 'SYS-002', message: 'リクエストの形式が正しくありません' } },
      { status: 400 }
    )
  }

  const result = updateReportSchema.safeParse(body)
  if (!result.success) {
    return validationErrorResponse(result.error.issues)
  }

  const report = await prisma.dailyReport.findUnique({ where: { id } })
  if (!report) {
    return notFoundResponse()
  }

  // 自分の日報のみ編集可
  if (report.salespersonId !== user.id) {
    return Response.json(
      { error: { code: 'BIZ-004', message: '他の担当者の日報は編集できません' } },
      { status: 403 }
    )
  }

  // ステータスチェック
  if (report.status !== 'draft') {
    return Response.json(
      { error: { code: 'BIZ-003', message: '提出済みまたは確認済みの日報は編集できません' } },
      { status: 403 }
    )
  }

  const { report_date, status, problem, plan, visit_records } = result.data

  const updated = await prisma.$transaction(async (tx) => {
    // 訪問記録を洗い替え
    await tx.visitRecord.deleteMany({ where: { reportId: id } })

    return tx.dailyReport.update({
      where: { id },
      data: {
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
      include: reportInclude,
    })
  })

  return Response.json({ data: formatReport(updated) })
}

// DELETE — not exposed, but needed for proper route definition
