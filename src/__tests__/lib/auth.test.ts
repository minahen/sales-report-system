// @vitest-environment node
// jose は Web Crypto API (SubtleCrypto) を使用するため jsdom 環境では動作しない。
// Node.js 環境を明示的に指定することで正しく動作させる。
import { describe, it, expect } from 'vitest'
import { signToken, verifyToken, hashPassword, comparePassword } from '@/lib/auth'

describe('signToken / verifyToken', () => {
  it('生成したトークンを検証すると正しいペイロードが返る', async () => {
    const payload = {
      sub: 'user-uuid-001',
      name: '田中 太郎',
      email: 'tanaka@example.com',
      role: 'salesperson' as const,
    }

    const token = await signToken(payload)
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)

    const verified = await verifyToken(token)
    expect(verified).not.toBeNull()
    expect(verified!.sub).toBe(payload.sub)
    expect(verified!.name).toBe(payload.name)
    expect(verified!.email).toBe(payload.email)
    expect(verified!.role).toBe(payload.role)
  })

  it('manager ロールのトークンを正しく検証できる', async () => {
    const token = await signToken({
      sub: 'manager-uuid',
      name: '山田 一郎',
      email: 'yamada@example.com',
      role: 'manager',
    })

    const verified = await verifyToken(token)
    expect(verified!.role).toBe('manager')
  })

  it('admin ロールのトークンを正しく検証できる', async () => {
    const token = await signToken({
      sub: 'admin-uuid',
      name: '佐藤 管理',
      email: 'sato@example.com',
      role: 'admin',
    })

    const verified = await verifyToken(token)
    expect(verified!.role).toBe('admin')
  })

  it('無効なトークン文字列を渡すと null が返る', async () => {
    const result = await verifyToken('invalid.token.string')
    expect(result).toBeNull()
  })

  it('空文字トークンを渡すと null が返る', async () => {
    const result = await verifyToken('')
    expect(result).toBeNull()
  })

  it('改ざんされたトーククンを渡すと null が返る', async () => {
    const token = await signToken({
      sub: 'user-001',
      name: 'テスト',
      email: 'test@example.com',
      role: 'salesperson',
    })
    // ペイロード部分（2番目のセグメント）を書き換える
    const parts = token.split('.')
    const tamperedPayload = Buffer.from(
      JSON.stringify({ sub: 'user-999', role: 'admin' })
    ).toString('base64url')
    const tampered = [parts[0], tamperedPayload, parts[2]].join('.')

    const result = await verifyToken(tampered)
    expect(result).toBeNull()
  })
})

describe('hashPassword / comparePassword', () => {
  it('パスワードをハッシュ化すると平文と異なる文字列になる', async () => {
    const password = 'Password123'
    const hash = await hashPassword(password)

    expect(hash).not.toBe(password)
    expect(hash.startsWith('$2')).toBe(true) // bcrypt ハッシュの形式
  })

  it('正しいパスワードと一致するハッシュの照合が true を返す', async () => {
    const password = 'Password01'
    const hash = await hashPassword(password)

    const result = await comparePassword(password, hash)
    expect(result).toBe(true)
  })

  it('誤ったパスワードとハッシュの照合が false を返す', async () => {
    const password = 'Password01'
    const wrongPassword = 'WrongPass99'
    const hash = await hashPassword(password)

    const result = await comparePassword(wrongPassword, hash)
    expect(result).toBe(false)
  })

  it('同じパスワードをハッシュ化しても毎回異なるハッシュが生成される（ソルト）', async () => {
    const password = 'Password123'
    const hash1 = await hashPassword(password)
    const hash2 = await hashPassword(password)

    expect(hash1).not.toBe(hash2)
    // ただし両方とも正しいパスワードで照合できる
    expect(await comparePassword(password, hash1)).toBe(true)
    expect(await comparePassword(password, hash2)).toBe(true)
  })
})
