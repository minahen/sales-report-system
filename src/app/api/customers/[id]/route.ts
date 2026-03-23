import type { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/request-context'
import { isManager, isAdmin, forbiddenResponse } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { updateCustomerSchema } from '@/lib/validations/customers'
import { validationErrorResponse, notFoundResponse, conflictResponse } from '@/lib/api-errors'

// GET /api/customers/[id] — 顧客詳細
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(req)
  if (!isManager(user.role)) {
    return forbiddenResponse()
  }

  const { id } = await params
  const customer = await prisma.customer.findUnique({
    where: { id, deletedAt: null },
  })
  if (!customer) {
    return notFoundResponse()
  }

  return Response.json({
    data: {
      id: customer.id,
      name: customer.name,
      address: customer.address,
      phone: customer.phone,
      industry: customer.industry,
      created_at: customer.createdAt.toISOString(),
    },
  })
}

// PUT /api/customers/[id] — 顧客更新
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

  const result = updateCustomerSchema.safeParse(body)
  if (!result.success) {
    return validationErrorResponse(result.error.issues)
  }

  const customer = await prisma.customer.findUnique({
    where: { id, deletedAt: null },
  })
  if (!customer) {
    return notFoundResponse()
  }

  const { name, address, phone, industry } = result.data

  const updated = await prisma.customer.update({
    where: { id },
    data: {
      name,
      address: address ?? null,
      phone: phone ?? null,
      industry: industry ?? null,
    },
  })

  return Response.json({
    data: {
      id: updated.id,
      name: updated.name,
      address: updated.address,
      phone: updated.phone,
      industry: updated.industry,
      created_at: updated.createdAt.toISOString(),
    },
  })
}

// DELETE /api/customers/[id] — 顧客削除（論理削除）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(req)
  if (!isAdmin(user.role)) {
    return forbiddenResponse()
  }

  const { id } = await params

  const customer = await prisma.customer.findUnique({
    where: { id, deletedAt: null },
  })
  if (!customer) {
    return notFoundResponse()
  }

  // 訪問記録との紐付きチェック
  const visitCount = await prisma.visitRecord.count({
    where: { customerId: id },
  })
  if (visitCount > 0) {
    return conflictResponse(
      'BIZ-008',
      'この顧客は訪問記録に使用されているため削除できません'
    )
  }

  await prisma.customer.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  return new Response(null, { status: 204 })
}
