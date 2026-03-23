// JWTはステートレスのためサーバー側でのトークン無効化は行わない。
// クライアント側でトークンを削除することでログアウトを実現する。
// NOTE: テスト仕様 API-AUTH-021「ログアウト後に同トークンで再アクセス → 401」は
// 現実装では満たせない。将来的にトークンブラックリスト（Redis等）が必要な場合は
// Issue を起票して対応すること。
export async function POST() {
  return new Response(null, { status: 204 })
}
