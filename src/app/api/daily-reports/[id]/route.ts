// GET /api/daily-reports/[id] — 日報詳細
// PUT /api/daily-reports/[id] — 日報更新
// 実装は Issue #6 (API-01)、Issue #7 (API-02) で行う
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestUser } from '@/lib/request'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getRequestUser(request)
  if (!user) {
    return Response.json(
      { error: { code: 'SYS-003', message: 'セッションが切れました。再度ログインしてください。' } },
      { status: 401 }
    )
  }

  const { id } = await params

  const report = await prisma.dailyReport.findUnique({
    where: { id },
    include: {
      salesperson: {
        select: { id: true, name: true, managerId: true },
      },
      visitRecords: {
        orderBy: { order: 'asc' },
        include: {
          customer: {
            select: { id: true, name: true },
          },
        },
      },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          commenter: {
            select: { id: true, name: true },
          },
        },
      },
    },
  })

  if (!report) {
    return Response.json(
      { error: { code: 'SYS-005', message: '対象データが見つかりません' } },
      { status: 404 }
    )
  }

  // アクセス権チェック
  const isSelf = report.salespersonId === user.id
  if (!isSelf) {
    if (user.role === 'salesperson') {
      return Response.json(
        { error: { code: 'SYS-004', message: 'この操作を行う権限がありません' } },
        { status: 403 }
      )
    }
    if (user.role === 'manager') {
      // manager は直属の部下の日報のみ閲覧可
      const isSubordinate = report.salesperson.managerId === user.id
      if (!isSubordinate) {
        return Response.json(
          { error: { code: 'SYS-004', message: 'この操作を行う権限がありません' } },
          { status: 403 }
        )
      }
    }
    // admin は全員閲覧可
  }

  const data = {
    id: report.id,
    report_date: report.reportDate.toISOString().slice(0, 10),
    status: report.status,
    problem: report.problem,
    plan: report.plan,
    salesperson: {
      id: report.salesperson.id,
      name: report.salesperson.name,
    },
    visit_records: report.visitRecords.map((vr) => ({
      id: vr.id,
      order: vr.order,
      customer: {
        id: vr.customer.id,
        name: vr.customer.name,
      },
      visit_content: vr.visitContent,
      visited_at: vr.visitedAt,
    })),
    comments: report.comments.map((c) => ({
      id: c.id,
      content: c.content,
      commenter: {
        id: c.commenter.id,
        name: c.commenter.name,
      },
      created_at: c.createdAt.toISOString(),
      updated_at: c.updatedAt.toISOString(),
    })),
    created_at: report.createdAt.toISOString(),
    updated_at: report.updatedAt.toISOString(),
  }

  return Response.json({ data })
}

export async function PUT() {
  return Response.json({ message: 'Not implemented' }, { status: 501 })
}
