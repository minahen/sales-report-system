// PATCH /api/daily-reports/[id]/review — 確認済みに更新
// 実装は Issue #7 (API-02) で行う
import type { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/request-context'
import { isManager, forbiddenResponse } from '@/lib/rbac'

export async function PATCH(req: NextRequest) {
  const user = getAuthUser(req)
  if (!isManager(user.role)) {
    return forbiddenResponse()
  }

  return Response.json({ message: 'Not implemented' }, { status: 501 })
}
