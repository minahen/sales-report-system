import type { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/request-context'
import { isAdmin, forbiddenResponse } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { createSalespersonSchema } from '@/lib/validations/salespeople'
import { validationErrorResponse, conflictResponse } from '@/lib/api-errors'
import { hashPassword } from '@/lib/auth'

// GET /api/salespeople — 営業担当者一覧
export async function GET(req: NextRequest) {
  const user = getAuthUser(req)
  if (!isAdmin(user.role)) {
    return forbiddenResponse()
  }

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') ?? '20', 10)))

  const where = { deletedAt: null }

  const [total, salespeople] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: { createdAt: 'asc' },
      include: { manager: { select: { id: true, name: true } } },
    }),
  ])

  const data = salespeople.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    role: s.role,
    manager: s.manager,
    created_at: s.createdAt.toISOString(),
  }))

  return Response.json({
    data,
    meta: { page, per_page: perPage, total },
  })
}

// POST /api/salespeople — 営業担当者登録
export async function POST(req: NextRequest) {
  const user = getAuthUser(req)
  if (!isAdmin(user.role)) {
    return forbiddenResponse()
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json(
      { error: { code: 'SYS-002', message: 'リクエストの形式が正しくありません' } },
      { status: 400 }
    )
  }

  const result = createSalespersonSchema.safeParse(body)
  if (!result.success) {
    return validationErrorResponse(result.error.issues)
  }

  const { name, email, password, role, manager_id } = result.data

  // メールアドレス重複チェック
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return conflictResponse('BIZ-006', 'このメールアドレスはすでに登録されています')
  }

  const passwordHash = await hashPassword(password)

  const salesperson = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      managerId: manager_id ?? null,
    },
    include: { manager: { select: { id: true, name: true } } },
  })

  return Response.json(
    {
      data: {
        id: salesperson.id,
        name: salesperson.name,
        email: salesperson.email,
        role: salesperson.role,
        manager: salesperson.manager,
        created_at: salesperson.createdAt.toISOString(),
      },
    },
    { status: 201 }
  )
}
