import type { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/request-context'
import { isManager, isAdmin, forbiddenResponse } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { createCustomerSchema } from '@/lib/validations/customers'
import { validationErrorResponse } from '@/lib/api-errors'

// GET /api/customers — 顧客一覧
export async function GET(req: NextRequest) {
  const user = getAuthUser(req)
  if (!isManager(user.role)) {
    return forbiddenResponse()
  }

  const { searchParams } = req.nextUrl
  const keyword = searchParams.get('keyword')
  const industry = searchParams.get('industry')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') ?? '20', 10)))

  const where: Record<string, unknown> = { deletedAt: null }
  if (keyword) {
    where.name = { contains: keyword, mode: 'insensitive' }
  }
  if (industry) {
    where.industry = industry
  }

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const data = customers.map((c) => ({
    id: c.id,
    name: c.name,
    address: c.address,
    phone: c.phone,
    industry: c.industry,
    created_at: c.createdAt.toISOString(),
  }))

  return Response.json({
    data,
    meta: { page, per_page: perPage, total },
  })
}

// POST /api/customers — 顧客登録
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

  const result = createCustomerSchema.safeParse(body)
  if (!result.success) {
    return validationErrorResponse(result.error.issues)
  }

  const { name, address, phone, industry } = result.data

  const customer = await prisma.customer.create({
    data: {
      name,
      address: address ?? null,
      phone: phone ?? null,
      industry: industry ?? null,
    },
  })

  return Response.json(
    {
      data: {
        id: customer.id,
        name: customer.name,
        address: customer.address,
        phone: customer.phone,
        industry: customer.industry,
        created_at: customer.createdAt.toISOString(),
      },
    },
    { status: 201 }
  )
}
