// POST /api/auth/refresh
import { verifyToken, signToken } from '@/lib/auth'

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

  let payload: { id: string; role: string }
  try {
    payload = await verifyToken(token)
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

  const { token: newToken, expiresAt } = await signToken({ id: payload.id, role: payload.role })

  return Response.json(
    {
      data: {
        token: newToken,
        expires_at: expiresAt,
      },
    },
    { status: 200 },
  )
}
