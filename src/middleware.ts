import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = ['/api/auth/login', '/login']

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/')) ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico'
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return NextResponse.json(
      {
        error: {
          code: 'SYS-003',
          message: 'セッションが切れました。再度ログインしてください。',
        },
      },
      { status: 401 },
    )
  }

  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    return NextResponse.json(
      { error: { code: 'SYS-002', message: 'サーバーエラーが発生しました。管理者にお問い合わせください。' } },
      { status: 500 },
    )
  }

  try {
    const secret = new TextEncoder().encode(jwtSecret)
    const { payload } = await jwtVerify(token, secret)

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', String(payload.id ?? ''))
    requestHeaders.set('x-user-role', String(payload.role ?? ''))

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch {
    return NextResponse.json(
      {
        error: {
          code: 'SYS-003',
          message: 'セッションが切れました。再度ログインしてください。',
        },
      },
      { status: 401 },
    )
  }
}

export const config = {
  matcher: ['/api/:path*'],
}
