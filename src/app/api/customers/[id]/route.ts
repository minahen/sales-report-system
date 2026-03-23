// GET    /api/customers/[id] — 顧客詳細
// PUT    /api/customers/[id] — 顧客更新
// DELETE /api/customers/[id] — 顧客削除（論理削除）
// 実装は Issue #10 (API-05) で行う
export async function GET() {
  return Response.json({ message: 'Not implemented' }, { status: 501 })
}

export async function PUT() {
  return Response.json({ message: 'Not implemented' }, { status: 501 })
}

export async function DELETE() {
  return new Response(null, { status: 501 })
}
