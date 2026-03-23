// GET  /api/customers — 顧客一覧
// POST /api/customers — 顧客登録
// 実装は Issue #10 (API-05) で行う
import type { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/request-context'
import { isManager, isAdmin, forbiddenResponse } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  const user = getAuthUser(req)
  if (!isManager(user.role)) {
    return forbiddenResponse()
  }

  return Response.json({ message: 'Not implemented' }, { status: 501 })
}

export async function POST(req: NextRequest) {
  const user = getAuthUser(req)
  if (!isAdmin(user.role)) {
    return forbiddenResponse()
  }

  return Response.json({ message: 'Not implemented' }, { status: 501 })
}
