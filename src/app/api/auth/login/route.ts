import type { NextRequest } from 'next/server'
import { loginSchema } from '@/lib/validations/auth'
import { comparePassword, signToken, getTokenExpiry } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/types'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json(
      { error: { code: 'SYS-002', message: 'リクエストの形式が正しくありません' } },
      { status: 400 }
    )
  }

  const result = loginSchema.safeParse(body)
  if (!result.success) {
    const details = result.error.issues.map((e) => ({
      field: (e.path.join('.') || e.path[0]?.toString()) ?? '',
      code: e.message,
      message: fieldErrorMessage(e.message),
    }))
    return Response.json(
      { error: { code: 'SYS-002', message: '入力内容にエラーがあります', details } },
      { status: 400 }
    )
  }

  const { email, password } = result.data

  const user = await prisma.user.findUnique({
    where: { email, deletedAt: null },
  })

  if (!user || !(await comparePassword(password, user.passwordHash))) {
    return Response.json(
      {
        error: {
          code: 'BIZ-001',
          message: 'メールアドレスまたはパスワードが正しくありません',
        },
      },
      { status: 401 }
    )
  }

  const token = await signToken({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
  })

  return Response.json(
    {
      data: {
        token,
        expires_at: getTokenExpiry(),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    },
    { status: 200 }
  )
}

const ERROR_MESSAGES: Record<string, string> = {
  'L-01': 'メールアドレスを入力してください',
  'L-02': 'メールアドレスの形式が正しくありません',
  'L-03': 'パスワードを入力してください',
  'L-04': 'パスワードは8文字以上で入力してください',
}

function fieldErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? code
}
