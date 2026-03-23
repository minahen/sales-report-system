// PUT /api/daily-reports/[id]/comments/[commentId]    — コメント更新
// DELETE /api/daily-reports/[id]/comments/[commentId] — コメント削除
// 実装は Issue #9 (API-04) で行う
export async function PUT() {
  return Response.json({ message: 'Not implemented' }, { status: 501 })
}

export async function DELETE() {
  return new Response(null, { status: 501 })
}
