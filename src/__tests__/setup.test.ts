import { describe, it, expect } from 'vitest'
import type { Role, ReportStatus, AuthUser, PaginationMeta } from '@/types'

describe('型定義のセットアップ確認', () => {
  it('Role型の値が正しく定義されている', () => {
    const roles: Role[] = ['salesperson', 'manager', 'admin']
    expect(roles).toHaveLength(3)
    expect(roles).toContain('salesperson')
    expect(roles).toContain('manager')
    expect(roles).toContain('admin')
  })

  it('ReportStatus型の値が正しく定義されている', () => {
    const statuses: ReportStatus[] = ['draft', 'submitted', 'reviewed']
    expect(statuses).toHaveLength(3)
    expect(statuses).toContain('draft')
    expect(statuses).toContain('submitted')
    expect(statuses).toContain('reviewed')
  })

  it('AuthUser型の構造が正しい', () => {
    const user: AuthUser = {
      id: 'test-uuid',
      name: '田中 太郎',
      email: 'tanaka@example.com',
      role: 'salesperson',
    }
    expect(user.id).toBe('test-uuid')
    expect(user.name).toBe('田中 太郎')
    expect(user.email).toBe('tanaka@example.com')
    expect(user.role).toBe('salesperson')
  })

  it('PaginationMeta型の構造が正しい', () => {
    const meta: PaginationMeta = {
      page: 1,
      per_page: 20,
      total: 100,
    }
    expect(meta.page).toBe(1)
    expect(meta.per_page).toBe(20)
    expect(meta.total).toBe(100)
  })
})
