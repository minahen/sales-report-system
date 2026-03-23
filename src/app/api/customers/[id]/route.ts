// GET    /api/customers/[id] — 顧客詳細
// PUT    /api/customers/[id] — 顧客更新
// DELETE /api/customers/[id] — 顧客削除（論理削除）
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
