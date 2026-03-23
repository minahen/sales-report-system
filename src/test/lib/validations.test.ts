// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { loginSchema } from '@/lib/validations/auth'
import { createReportSchema } from '@/lib/validations/reports'
import { createCommentSchema } from '@/lib/validations/comments'
import { createCustomerSchema } from '@/lib/validations/customers'
import { createSalespersonSchema } from '@/lib/validations/salespeople'

describe('loginSchema', () => {
  it('有効なメールアドレスとパスワードで成功する', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: 'Password01' })
    expect(result.success).toBe(true)
  })

  it('メールアドレスが空の場合L-01エラー', () => {
    const result = loginSchema.safeParse({ email: '', password: 'Password01' })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'L-01')
    expect(issue).toBeDefined()
  })

  it('メールアドレスが不正形式の場合L-02エラー', () => {
    const result = loginSchema.safeParse({ email: 'notanemail', password: 'Password01' })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'L-02')
    expect(issue).toBeDefined()
  })

  it('パスワードが空の場合L-03エラー', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: '' })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'L-03')
    expect(issue).toBeDefined()
  })

  it('パスワードが7文字の場合L-04エラー', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: 'Pass123' })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'L-04')
    expect(issue).toBeDefined()
  })

  it('パスワードが8文字以上で成功する', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: 'Password1' })
    expect(result.success).toBe(true)
  })
})

describe('createReportSchema', () => {
  const validReport = {
    report_date: '2024-11-20',
    status: 'draft' as const,
  }

  it('有効な下書き日報データで成功する', () => {
    const result = createReportSchema.safeParse(validReport)
    expect(result.success).toBe(true)
  })

  it('report_dateの形式が不正の場合エラー', () => {
    const result = createReportSchema.safeParse({ ...validReport, report_date: '20241120' })
    expect(result.success).toBe(false)
  })

  it('statusが不正の場合エラー', () => {
    const result = createReportSchema.safeParse({ ...validReport, status: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('problemが2000文字以内で成功する', () => {
    const result = createReportSchema.safeParse({ ...validReport, problem: 'a'.repeat(2000) })
    expect(result.success).toBe(true)
  })

  it('problemが2001文字の場合RE-07エラー', () => {
    const result = createReportSchema.safeParse({ ...validReport, problem: 'a'.repeat(2001) })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'RE-07')
    expect(issue).toBeDefined()
  })

  it('planが2001文字の場合RE-08エラー', () => {
    const result = createReportSchema.safeParse({ ...validReport, plan: 'a'.repeat(2001) })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'RE-08')
    expect(issue).toBeDefined()
  })

  it('visit_recordsのcustomer_idが空の場合RE-01エラー', () => {
    const result = createReportSchema.safeParse({
      ...validReport,
      visit_records: [{ customer_id: '', visit_content: '内容', order: 1 }],
    })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'RE-01')
    expect(issue).toBeDefined()
  })

  it('visit_contentが空の場合RE-02エラー', () => {
    const result = createReportSchema.safeParse({
      ...validReport,
      visit_records: [{ customer_id: 'cust-1', visit_content: '', order: 1 }],
    })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'RE-02')
    expect(issue).toBeDefined()
  })

  it('visit_contentが1001文字の場合RE-03エラー', () => {
    const result = createReportSchema.safeParse({
      ...validReport,
      visit_records: [{ customer_id: 'cust-1', visit_content: 'a'.repeat(1001), order: 1 }],
    })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'RE-03')
    expect(issue).toBeDefined()
  })

  it('visited_atの形式が不正の場合RE-04エラー', () => {
    const result = createReportSchema.safeParse({
      ...validReport,
      visit_records: [{ customer_id: 'cust-1', visit_content: '内容', visited_at: '9:00', order: 1 }],
    })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'RE-04')
    expect(issue).toBeDefined()
  })

  it('visited_atが範囲外（25:00）の場合RE-05エラー', () => {
    const result = createReportSchema.safeParse({
      ...validReport,
      visit_records: [{ customer_id: 'cust-1', visit_content: '内容', visited_at: '25:00', order: 1 }],
    })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'RE-05')
    expect(issue).toBeDefined()
  })

  it('visited_atが正常値（23:59）の場合成功する', () => {
    const result = createReportSchema.safeParse({
      ...validReport,
      visit_records: [{ customer_id: 'cust-1', visit_content: '内容', visited_at: '23:59', order: 1 }],
    })
    expect(result.success).toBe(true)
  })
})

describe('createCommentSchema', () => {
  it('有効なコメントで成功する', () => {
    const result = createCommentSchema.safeParse({ content: 'コメント内容' })
    expect(result.success).toBe(true)
  })

  it('contentが空の場合RD-01エラー', () => {
    const result = createCommentSchema.safeParse({ content: '' })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'RD-01')
    expect(issue).toBeDefined()
  })

  it('contentが1001文字の場合RD-02エラー', () => {
    const result = createCommentSchema.safeParse({ content: 'a'.repeat(1001) })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'RD-02')
    expect(issue).toBeDefined()
  })

  it('contentが1000文字以内で成功する', () => {
    const result = createCommentSchema.safeParse({ content: 'a'.repeat(1000) })
    expect(result.success).toBe(true)
  })
})

describe('createCustomerSchema', () => {
  it('有効な顧客データで成功する', () => {
    const result = createCustomerSchema.safeParse({ name: '株式会社テスト', industry: 'IT' })
    expect(result.success).toBe(true)
  })

  it('nameが空の場合CE-01エラー', () => {
    const result = createCustomerSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'CE-01')
    expect(issue).toBeDefined()
  })

  it('nameが101文字の場合CE-02エラー', () => {
    const result = createCustomerSchema.safeParse({ name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'CE-02')
    expect(issue).toBeDefined()
  })

  it('addressが201文字の場合CE-03エラー', () => {
    const result = createCustomerSchema.safeParse({ name: 'テスト', address: 'a'.repeat(201) })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'CE-03')
    expect(issue).toBeDefined()
  })

  it('phoneに無効文字が含まれる場合CE-04エラー', () => {
    const result = createCustomerSchema.safeParse({ name: 'テスト', phone: 'abc-123' })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'CE-04')
    expect(issue).toBeDefined()
  })

  it('phoneが数字とハイフンのみの場合成功する', () => {
    const result = createCustomerSchema.safeParse({ name: 'テスト', phone: '03-1234-5678' })
    expect(result.success).toBe(true)
  })

  it('phoneが21文字の場合CE-05エラー', () => {
    const result = createCustomerSchema.safeParse({ name: 'テスト', phone: '1'.repeat(21) })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'CE-05')
    expect(issue).toBeDefined()
  })
})

describe('createSalespersonSchema', () => {
  const validData = {
    name: '田中 太郎',
    email: 'tanaka@example.com',
    password: 'Password01',
    role: 'salesperson' as const,
  }

  it('有効な担当者データで成功する', () => {
    const result = createSalespersonSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('nameが空の場合SE-01エラー', () => {
    const result = createSalespersonSchema.safeParse({ ...validData, name: '' })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'SE-01')
    expect(issue).toBeDefined()
  })

  it('nameが51文字の場合SE-02エラー', () => {
    const result = createSalespersonSchema.safeParse({ ...validData, name: 'a'.repeat(51) })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'SE-02')
    expect(issue).toBeDefined()
  })

  it('emailが空の場合SE-03エラー', () => {
    const result = createSalespersonSchema.safeParse({ ...validData, email: '' })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'SE-03')
    expect(issue).toBeDefined()
  })

  it('emailが不正形式の場合SE-04エラー', () => {
    const result = createSalespersonSchema.safeParse({ ...validData, email: 'notanemail' })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'SE-04')
    expect(issue).toBeDefined()
  })

  it('passwordが7文字の場合SE-07エラー', () => {
    const result = createSalespersonSchema.safeParse({ ...validData, password: 'Pass123' })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'SE-07')
    expect(issue).toBeDefined()
  })

  it('passwordが英字のみの場合SE-08エラー', () => {
    const result = createSalespersonSchema.safeParse({ ...validData, password: 'aaaaaaaa' })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'SE-08')
    expect(issue).toBeDefined()
  })

  it('passwordが数字のみの場合SE-08エラー', () => {
    const result = createSalespersonSchema.safeParse({ ...validData, password: '12345678' })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'SE-08')
    expect(issue).toBeDefined()
  })

  it('roleが不正の場合SE-09エラー', () => {
    const result = createSalespersonSchema.safeParse({ ...validData, role: 'invalid' as never })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.message === 'SE-09')
    expect(issue).toBeDefined()
  })

  it('manager_idはオプションで省略可能', () => {
    const result = createSalespersonSchema.safeParse(validData)
    expect(result.success).toBe(true)
    expect(result.data?.manager_id).toBeUndefined()
  })
})
