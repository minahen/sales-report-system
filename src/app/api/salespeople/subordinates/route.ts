import type { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/request-context'
import { isManager, forbiddenResponse } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

// GET /api/salespeople/subordinates — 部下一覧
export async function GET(req: NextRequest) {
  const user = getAuthUser(req)
  if (!isManager(user.role)) {
    return forbiddenResponse()
  }

  const subordinates = await prisma.user.findMany({
    where: { managerId: user.id, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return Response.json({ data: subordinates })
}
