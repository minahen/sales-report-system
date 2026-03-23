import type { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/request-context'
import { prisma } from '@/lib/prisma'
import { isManager, forbiddenResponse } from '@/lib/rbac'
import { notFoundResponse, validationErrorResponse } from '@/lib/api-errors'
import { createCommentSchema } from '@/lib/validations/comments'

// POST /api/daily-reports/[id]/comments — コメント投稿
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(req)

  if (!isManager(user.role)) {
    return Response.json(
      { error: { code: 'SYS-004', message: 'この操作を行う権限がありません' } },
      { status: 403 }
    )
  }

  const { id: reportId } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json(
      { error: { code: 'SYS-002', message: 'リクエストの形式が正しくありません' } },
      { status: 400 }
    )
  }

  const result = createCommentSchema.safeParse(body)
  if (!result.success) {
    return validationErrorResponse(result.error.issues)
  }

  const report = await prisma.dailyReport.findUnique({ where: { id: reportId } })
  if (!report) {
    return notFoundResponse()
  }

  const comment = await prisma.comment.create({
    data: {
      reportId,
      commenterId: user.id,
      content: result.data.content,
    },
    include: { commenter: { select: { id: true, name: true } } },
  })

  return Response.json(
    {
      data: {
        id: comment.id,
        content: comment.content,
        commenter: comment.commenter,
        created_at: comment.createdAt.toISOString(),
        updated_at: comment.updatedAt.toISOString(),
      },
    },
    { status: 201 }
  )
}

// suppress unused import warning
void forbiddenResponse
