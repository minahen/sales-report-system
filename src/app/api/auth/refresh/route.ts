import type { NextRequest } from 'next/server'
import { signToken, getTokenExpiry } from '@/lib/auth'
import { getAuthUser } from '@/lib/request-context'

// ミドルウェアで認証済みのため、ここに到達したら有効なトークンを持っている
export async function POST(req: NextRequest) {
  const user = getAuthUser(req)

  const token = await signToken({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  })

  return Response.json({
    data: {
      token,
      expires_at: getTokenExpiry(),
    },
  })
}
