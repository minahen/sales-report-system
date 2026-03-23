import type { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/request-context'
import { prisma } from '@/lib/prisma'
import { isManager, forbiddenResponse } from '@/lib/rbac'
import { notFoundResponse, conflictResponse } from '@/lib/api-errors'

// PATCH /api/daily-reports/[id]/review — 確認済みに更新
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(req)

  if (!isManager(user.role)) {
    return forbiddenResponse()
  }

  const { id } = await params

  const report = await prisma.dailyReport.findUnique({ where: { id } })
  if (!report) {
    return notFoundResponse()
  }

  if (report.status !== 'submitted') {
    return conflictResponse('BIZ-005', 'すでに確認済みの日報です')
  }

  const updated = await prisma.dailyReport.update({
    where: { id },
    data: { status: 'reviewed' },
    select: { id: true, status: true, updatedAt: true },
  })

  return Response.json({
    data: {
      id: updated.id,
      status: updated.status,
      updated_at: updated.updatedAt.toISOString(),
    },
  })
}
