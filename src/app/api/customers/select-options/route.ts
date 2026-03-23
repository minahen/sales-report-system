import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/customers/select-options — 顧客選択肢一覧（全ロール可）
export async function GET(_req: NextRequest) {
  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return Response.json({ data: customers })
}
