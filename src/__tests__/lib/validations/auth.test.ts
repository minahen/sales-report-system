import { describe, it, expect } from 'vitest'
import { loginSchema } from '@/lib/validations/auth'

describe('loginSchema', () => {
  describe('正常系', () => {
    it('有効なメールアドレスとパスワードでバリデーションが成功する', () => {
      const result = loginSchema.safeParse({
        email: 'tanaka@example.com',
        password: 'Password01',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('tanaka@example.com')
        expect(result.data.password).toBe('Password01')
      }
    })

    it('8文字ちょうどのパスワードでバリデーションが成功する', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'Pass1234',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('メールアドレスバリデーション', () => {
    it('メールアドレスが空の場合にL-01エラーを返す', () => {
      const result = loginSchema.safeParse({ email: '', password: 'Password01' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const emailErrors = result.error.issues.filter((i) => i.path[0] === 'email')
        expect(emailErrors.some((e) => e.message === 'L-01')).toBe(true)
      }
    })

    it('メールアドレス形式が不正な場合にL-02エラーを返す', () => {
      const result = loginSchema.safeParse({ email: 'notanemail', password: 'Password01' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const emailErrors = result.error.issues.filter((i) => i.path[0] === 'email')
        expect(emailErrors.some((e) => e.message === 'L-02')).toBe(true)
      }
    })

    it('@マークのないメールアドレスでL-02エラーを返す', () => {
      const result = loginSchema.safeParse({ email: 'tanakaexample.com', password: 'Password01' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const emailErrors = result.error.issues.filter((i) => i.path[0] === 'email')
        expect(emailErrors.some((e) => e.message === 'L-02')).toBe(true)
      }
    })
  })

  describe('パスワードバリデーション', () => {
    it('パスワードが空の場合にL-03エラーを返す', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com', password: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const passwordErrors = result.error.issues.filter((i) => i.path[0] === 'password')
        expect(passwordErrors.some((e) => e.message === 'L-03')).toBe(true)
      }
    })

    it('パスワードが7文字の場合にL-04エラーを返す', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com', password: 'Pass123' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const passwordErrors = result.error.issues.filter((i) => i.path[0] === 'password')
        expect(passwordErrors.some((e) => e.message === 'L-04')).toBe(true)
      }
    })
  })

  describe('複合バリデーション', () => {
    it('メールアドレスとパスワードが両方空の場合に両方のエラーを返す', () => {
      const result = loginSchema.safeParse({ email: '', password: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const codes = result.error.issues.map((i) => i.message)
        expect(codes).toContain('L-01')
        expect(codes).toContain('L-03')
      }
    })
  })
})
