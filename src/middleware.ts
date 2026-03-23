import { type NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

/** 認証不要のパス */
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/login',
  '/_next',
  '/favicon.ico',
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return Response.json(
      {
        error: {
          code: 'SYS-003',
          message: 'セッションが切れました。再度ログインしてください',
        },
      },
      { status: 401 }
    )
  }

  const payload = await verifyToken(token)

  if (!payload) {
    return Response.json(
      {
        error: {
          code: 'SYS-003',
          message: 'セッションが切れました。再度ログインしてください',
        },
      },
      { status: 401 }
    )
  }

  // 検証済みユーザー情報をリクエストヘッダーで後続ハンドラーに伝える
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-user-id', payload.sub)
  requestHeaders.set('x-user-role', payload.role)
  requestHeaders.set('x-user-name', payload.name)
  requestHeaders.set('x-user-email', payload.email)

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico).*)'],
}
