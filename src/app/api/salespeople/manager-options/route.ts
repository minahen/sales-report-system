import type { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/request-context'
import { isAdmin, forbiddenResponse } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

// GET /api/salespeople/manager-options — 上長候補一覧
export async function GET(req: NextRequest) {
  const user = getAuthUser(req)
  if (!isAdmin(user.role)) {
    return forbiddenResponse()
  }

  const managers = await prisma.user.findMany({
    where: {
      role: { in: ['manager', 'admin'] },
      deletedAt: null,
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return Response.json({ data: managers })
}
