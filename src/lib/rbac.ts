import type { Role } from '@/types'

/** 指定ロールのいずれかを持つか確認する。持たない場合は 403 レスポンスを返すべき */
export function hasRole(userRole: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole)
}

/** manager または admin ロールか */
export function isManager(role: Role): boolean {
  return role === 'manager' || role === 'admin'
}

/** admin ロールか */
export function isAdmin(role: Role): boolean {
  return role === 'admin'
}

/** 403 エラーレスポンスを生成する */
export function forbiddenResponse(): Response {
  return Response.json(
    {
      error: {
        code: 'SYS-004',
        message: 'この操作を行う権限がありません',
      },
    },
    { status: 403 }
  )
}
