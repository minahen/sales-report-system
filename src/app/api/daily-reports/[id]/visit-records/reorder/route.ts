import type { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/request-context'
import { prisma } from '@/lib/prisma'
import { notFoundResponse } from '@/lib/api-errors'
import { z } from 'zod'

const reorderSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string(),
      order: z.number().int(),
    })
  ),
})

// PATCH /api/daily-reports/[id]/visit-records/reorder — 訪問記録並び替え
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(req)
  const { id: reportId } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json(
      { error: { code: 'SYS-002', message: 'リクエストの形式が正しくありません' } },
      { status: 400 }
    )
  }

  const result = reorderSchema.safeParse(body)
  if (!result.success) {
    return Response.json(
      { error: { code: 'SYS-002', message: '入力内容にエラーがあります' } },
      { status: 400 }
    )
  }

  const report = await prisma.dailyReport.findUnique({ where: { id: reportId } })
  if (!report) {
    return notFoundResponse()
  }

  if (report.salespersonId !== user.id) {
    return Response.json(
      { error: { code: 'BIZ-004', message: '他の担当者の日報は編集できません' } },
      { status: 403 }
    )
  }

  if (report.status !== 'draft') {
    return Response.json(
      { error: { code: 'BIZ-003', message: '提出済みまたは確認済みの日報は編集できません' } },
      { status: 403 }
    )
  }

  const { orders } = result.data

  // 存在確認
  for (const item of orders) {
    const vr = await prisma.visitRecord.findUnique({
      where: { id: item.id, reportId },
    })
    if (!vr) {
      return notFoundResponse()
    }
  }

  // トランザクションで並び替え
  await prisma.$transaction(
    orders.map((item) =>
      prisma.visitRecord.update({
        where: { id: item.id },
        data: { order: item.order },
      })
    )
  )

  return Response.json({ data: { updated: true } })
}
