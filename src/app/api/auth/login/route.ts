// POST /api/auth/login
import { prisma } from '@/lib/prisma'
import { loginSchema } from '@/lib/validations/auth'
import { signToken, comparePassword, calculateExpiresAt } from '@/lib/auth'

const ERROR_MESSAGES: Record<string, string> = {
  'L-01': 'メールアドレスを入力してください',
  'L-02': 'メールアドレスの形式が正しくありません',
  'L-03': 'パスワードを入力してください',
  'L-04': 'パスワードは8文字以上で入力してください',
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      {
        error: {
          code: 'VAL-001',
          message: 'リクエストボディが不正です',
          details: [],
        },
      },
      { status: 400 },
    )
  }

  const result = loginSchema.safeParse(body)
  if (!result.success) {
    const details = result.error.issues.map((issue) => {
      const code = issue.message
      const field = issue.path.join('.')
      const message = ERROR_MESSAGES[code] ?? code
      return { field, code, message }
    })
    return Response.json(
      {
        error: {
          code: 'VAL-001',
          message: '入力内容にエラーがあります',
          details,
        },
      },
      { status: 400 },
    )
  }

  const { email, password } = result.data

  const user = await prisma.user.findFirst({
    where: {
      email,
      deletedAt: null,
    },
  })

  if (!user) {
    return Response.json(
      {
        error: {
          code: 'BIZ-001',
          message: 'メールアドレスまたはパスワードが正しくありません',
        },
      },
      { status: 401 },
    )
  }

  const passwordMatch = await comparePassword(password, user.passwordHash)
  if (!passwordMatch) {
    return Response.json(
      {
        error: {
          code: 'BIZ-001',
          message: 'メールアドレスまたはパスワードが正しくありません',
        },
      },
      { status: 401 },
    )
  }

  const token = await signToken({ id: user.id, role: user.role })
  const expires_at = calculateExpiresAt()

  return Response.json(
    {
      data: {
        token,
        expires_at,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    },
    { status: 200 },
  )
}
