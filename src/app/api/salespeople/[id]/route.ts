import type { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/request-context'
import { isAdmin, forbiddenResponse } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { updateSalespersonSchema } from '@/lib/validations/salespeople'
import { validationErrorResponse, notFoundResponse, conflictResponse } from '@/lib/api-errors'
import { hashPassword } from '@/lib/auth'

// GET /api/salespeople/[id] — 営業担当者詳細
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(req)
  if (!isAdmin(user.role)) {
    return forbiddenResponse()
  }

  const { id } = await params
  const salesperson = await prisma.user.findUnique({
    where: { id, deletedAt: null },
    include: { manager: { select: { id: true, name: true } } },
  })
  if (!salesperson) {
    return notFoundResponse()
  }

  return Response.json({
    data: {
      id: salesperson.id,
      name: salesperson.name,
      email: salesperson.email,
      role: salesperson.role,
      manager: salesperson.manager,
      created_at: salesperson.createdAt.toISOString(),
    },
  })
}

// PUT /api/salespeople/[id] — 営業担当者更新
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(req)
  if (!isAdmin(user.role)) {
    return forbiddenResponse()
  }

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json(
      { error: { code: 'SYS-002', message: 'リクエストの形式が正しくありません' } },
      { status: 400 }
    )
  }

  const result = updateSalespersonSchema.safeParse(body)
  if (!result.success) {
    return validationErrorResponse(result.error.issues)
  }

  const salesperson = await prisma.user.findUnique({
    where: { id, deletedAt: null },
  })
  if (!salesperson) {
    return notFoundResponse()
  }

  const { name, email, password, role, manager_id } = result.data

  // 自分自身を上長に設定しようとした場合
  if (manager_id && manager_id === id) {
    return conflictResponse('BIZ-007', '自分自身を上長に設定することはできません')
  }

  // メールアドレス重複チェック（自分自身と論理削除済みは除く）
  if (email !== salesperson.email) {
    const existing = await prisma.user.findFirst({ where: { email, deletedAt: null, id: { not: id } } })
    if (existing) {
      return conflictResponse('BIZ-006', 'このメールアドレスはすでに登録されています')
    }
  }

  const updateData: Record<string, unknown> = {
    name,
    email,
    role,
    managerId: manager_id ?? null,
  }
  if (password) {
    updateData.passwordHash = await hashPassword(password)
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    include: { manager: { select: { id: true, name: true } } },
  })

  return Response.json({
    data: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      manager: updated.manager,
      created_at: updated.createdAt.toISOString(),
    },
  })
}

// DELETE /api/salespeople/[id] — 営業担当者削除（論理削除）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(req)
  if (!isAdmin(user.role)) {
    return forbiddenResponse()
  }

  const { id } = await params

  const salesperson = await prisma.user.findUnique({
    where: { id, deletedAt: null },
  })
  if (!salesperson) {
    return notFoundResponse()
  }

  // 日報/コメント存在チェック
  const reportCount = await prisma.dailyReport.count({ where: { salespersonId: id } })
  const commentCount = await prisma.comment.count({ where: { commenterId: id } })

  if (reportCount > 0 || commentCount > 0) {
    return conflictResponse(
      'BIZ-009',
      'この担当者は日報またはコメントが存在するため削除できません'
    )
  }

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  return new Response(null, { status: 204 })
}
