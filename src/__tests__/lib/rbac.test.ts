import { describe, it, expect } from 'vitest'
import { hasRole, isManager, isAdmin, forbiddenResponse } from '@/lib/rbac'
import type { Role } from '@/types'

describe('hasRole', () => {
  it('ユーザーのロールが許可リストに含まれる場合 true を返す', () => {
    expect(hasRole('salesperson', ['salesperson', 'manager'])).toBe(true)
    expect(hasRole('manager', ['manager', 'admin'])).toBe(true)
    expect(hasRole('admin', ['admin'])).toBe(true)
  })

  it('ユーザーのロールが許可リストに含まれない場合 false を返す', () => {
    expect(hasRole('salesperson', ['manager', 'admin'])).toBe(false)
    expect(hasRole('manager', ['admin'])).toBe(false)
    expect(hasRole('salesperson', ['admin'])).toBe(false)
  })

  it('許可リストが空の場合は常に false を返す', () => {
    const roles: Role[] = ['salesperson', 'manager', 'admin']
    roles.forEach((role) => {
      expect(hasRole(role, [])).toBe(false)
    })
  })
})

describe('isManager', () => {
  it('manager ロールに対して true を返す', () => {
    expect(isManager('manager')).toBe(true)
  })

  it('admin ロールに対して true を返す（admin は manager 権限も持つ）', () => {
    expect(isManager('admin')).toBe(true)
  })

  it('salesperson ロールに対して false を返す', () => {
    expect(isManager('salesperson')).toBe(false)
  })
})

describe('isAdmin', () => {
  it('admin ロールに対して true を返す', () => {
    expect(isAdmin('admin')).toBe(true)
  })

  it('manager ロールに対して false を返す', () => {
    expect(isAdmin('manager')).toBe(false)
  })

  it('salesperson ロールに対して false を返す', () => {
    expect(isAdmin('salesperson')).toBe(false)
  })
})

describe('forbiddenResponse', () => {
  it('ステータス 403 のレスポンスを返す', async () => {
    const res = forbiddenResponse()
    expect(res.status).toBe(403)
  })

  it('エラーコード SYS-004 を含む JSON を返す', async () => {
    const res = forbiddenResponse()
    const body = await res.json()

    expect(body.error.code).toBe('SYS-004')
    expect(body.error.message).toBe('この操作を行う権限がありません')
  })
})
