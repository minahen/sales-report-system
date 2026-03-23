import type { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/request-context'
import { prisma } from '@/lib/prisma'
import { notFoundResponse } from '@/lib/api-errors'

// DELETE /api/daily-reports/[id]/visit-records/[visitId] — 訪問記録削除
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; visitId: string }> }
) {
  const user = getAuthUser(req)
  const { id: reportId, visitId } = await params

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

  const visitRecord = await prisma.visitRecord.findUnique({
    where: { id: visitId, reportId },
  })
  if (!visitRecord) {
    return notFoundResponse()
  }

  await prisma.visitRecord.delete({ where: { id: visitId } })

  return new Response(null, { status: 204 })
}
