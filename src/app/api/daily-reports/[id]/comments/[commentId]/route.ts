import type { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/request-context'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/rbac'
import { notFoundResponse, validationErrorResponse } from '@/lib/api-errors'
import { createCommentSchema } from '@/lib/validations/comments'

// PUT /api/daily-reports/[id]/comments/[commentId] — コメント更新
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const user = getAuthUser(req)
  const { commentId } = await params

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

  const comment = await prisma.comment.findUnique({ where: { id: commentId } })
  if (!comment) {
    return notFoundResponse()
  }

  // 投稿者本人のみ更新可
  if (comment.commenterId !== user.id) {
    return Response.json(
      { error: { code: 'SYS-004', message: 'この操作を行う権限がありません' } },
      { status: 403 }
    )
  }

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { content: result.data.content },
    include: { commenter: { select: { id: true, name: true } } },
  })

  return Response.json({
    data: {
      id: updated.id,
      content: updated.content,
      commenter: updated.commenter,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
    },
  })
}

// DELETE /api/daily-reports/[id]/comments/[commentId] — コメント削除
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const user = getAuthUser(req)
  const { commentId } = await params

  const comment = await prisma.comment.findUnique({ where: { id: commentId } })
  if (!comment) {
    return notFoundResponse()
  }

  // 投稿者本人またはadminのみ削除可
  if (comment.commenterId !== user.id && !isAdmin(user.role)) {
    return Response.json(
      { error: { code: 'SYS-004', message: 'この操作を行う権限がありません' } },
      { status: 403 }
    )
  }

  await prisma.comment.delete({ where: { id: commentId } })

  return new Response(null, { status: 204 })
}
