// POST /api/daily-reports/[id]/comments — コメント投稿
// 実装は Issue #9 (API-04) で行う
import type { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/request-context'
import { isManager, forbiddenResponse } from '@/lib/rbac'

export async function POST(req: NextRequest) {
  const user = getAuthUser(req)
  if (!isManager(user.role)) {
    return forbiddenResponse()
  }

  return Response.json({ message: 'Not implemented' }, { status: 501 })
}
