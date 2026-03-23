// POST /api/auth/logout
// JWTはステートレスなためサーバー側での無効化は行わない。
// トークン検証は middleware が担うため、ここでは 204 を返すのみ。
export async function POST() {
  return new Response(null, { status: 204 })
}
