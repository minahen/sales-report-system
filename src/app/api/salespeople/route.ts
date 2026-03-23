// GET  /api/salespeople — 営業担当者一覧
// POST /api/salespeople — 営業担当者登録
// 実装は Issue #11 (API-06) で行う
import type { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/request-context'
import { isAdmin, forbiddenResponse } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  const user = getAuthUser(req)
  if (!isAdmin(user.role)) {
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
