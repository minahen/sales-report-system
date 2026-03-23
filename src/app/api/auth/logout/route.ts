// POST /api/auth/logout
import { verifyToken } from '@/lib/auth'

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return Response.json(
      {
        error: {
          code: 'SYS-003',
          message: 'セッションが切れました。再度ログインしてください。',
        },
      },
      { status: 401 },
    )
  }

  try {
    await verifyToken(token)
  } catch {
    return Response.json(
      {
        error: {
          code: 'SYS-003',
          message: 'セッションが切れました。再度ログインしてください。',
        },
      },
      { status: 401 },
    )
  }

  // JWTはステートレスなのでサーバー側での無効化は行わない
  return new Response(null, { status: 204 })
}
