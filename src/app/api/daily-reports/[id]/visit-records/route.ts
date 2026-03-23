import type { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/request-context'
import { prisma } from '@/lib/prisma'
import { notFoundResponse, validationErrorResponse } from '@/lib/api-errors'
import { z } from 'zod'

const visitedAtSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'RE-04')
  .refine((val) => {
    const [h, m] = val.split(':').map(Number)
    return h >= 0 && h <= 23 && m >= 0 && m <= 59
  }, 'RE-05')

const addVisitRecordSchema = z.object({
  customer_id: z.string().min(1, 'RE-01'),
  visit_content: z.string().min(1, 'RE-02').max(1000, 'RE-03'),
  visited_at: visitedAtSchema.optional().or(z.literal('').transform(() => undefined)),
  order: z.number().int(),
})

// POST /api/daily-reports/[id]/visit-records — 訪問記録追加
export async function POST(
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

  const result = addVisitRecordSchema.safeParse(body)
  if (!result.success) {
    return validationErrorResponse(result.error.issues)
  }

  const report = await prisma.dailyReport.findUnique({ where: { id: reportId } })
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

  if (report.status !== 'draft') {
    return Response.json(
      { error: { code: 'BIZ-003', message: '提出済みまたは確認済みの日報は編集できません' } },
      { status: 403 }
    )
  }

  const { customer_id, visit_content, visited_at, order } = result.data

  const visitRecord = await prisma.visitRecord.create({
    data: {
      reportId,
      customerId: customer_id,
      visitContent: visit_content,
      visitedAt: visited_at ?? null,
      order,
    },
    include: { customer: { select: { id: true, name: true } } },
  })

  return Response.json(
    {
      data: {
        id: visitRecord.id,
        order: visitRecord.order,
        customer: visitRecord.customer,
        visit_content: visitRecord.visitContent,
        visited_at: visitRecord.visitedAt,
        created_at: visitRecord.createdAt.toISOString(),
      },
    },
    { status: 201 }
  )
}
