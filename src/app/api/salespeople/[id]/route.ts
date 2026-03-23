// GET    /api/salespeople/[id] — 営業担当者詳細
// PUT    /api/salespeople/[id] — 営業担当者更新
// DELETE /api/salespeople/[id] — 営業担当者削除（論理削除）
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

export async function PUT(req: NextRequest) {
  const user = getAuthUser(req)
  if (!isAdmin(user.role)) {
    return forbiddenResponse()
  }

  return Response.json({ message: 'Not implemented' }, { status: 501 })
}

export async function DELETE(req: NextRequest) {
  const user = getAuthUser(req)
  if (!isAdmin(user.role)) {
    return forbiddenResponse()
  }

  return new Response(null, { status: 501 })
}
