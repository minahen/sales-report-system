// GET /api/salespeople/subordinates — 部下一覧
// 実装は Issue #11 (API-06) で行う
import type { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/request-context'
import { isManager, forbiddenResponse } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  const user = getAuthUser(req)
  if (!isManager(user.role)) {
    return forbiddenResponse()
  }

  return Response.json({ message: 'Not implemented' }, { status: 501 })
}
