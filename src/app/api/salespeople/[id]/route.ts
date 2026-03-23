// GET    /api/salespeople/[id] — 営業担当者詳細
// PUT    /api/salespeople/[id] — 営業担当者更新
// DELETE /api/salespeople/[id] — 営業担当者削除（論理削除）
// 実装は Issue #11 (API-06) で行う
export async function GET() {
  return Response.json({ message: 'Not implemented' }, { status: 501 })
}

export async function PUT() {
  return Response.json({ message: 'Not implemented' }, { status: 501 })
}

export async function DELETE() {
  return new Response(null, { status: 501 })
}
