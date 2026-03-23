import type { ZodIssue } from 'zod'
import type { ApiErrorDetail } from '@/types'

/** 404 Not Found レスポンス */
export function notFoundResponse(message = '対象データが見つかりません'): Response {
  return Response.json(
    { error: { code: 'SYS-005', message } },
    { status: 404 }
  )
}

/** 401 Unauthorized レスポンス */
export function unauthorizedResponse(): Response {
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

/** 400 Bad Request レスポンス */
export function badRequestResponse(details?: ApiErrorDetail[]): Response {
  return Response.json(
    {
      error: {
        code: 'SYS-002',
        message: '入力内容にエラーがあります',
        ...(details ? { details } : {}),
      },
    },
    { status: 400 }
  )
}

/** 409 Conflict レスポンス */
export function conflictResponse(code: string, message: string): Response {
  return Response.json(
    { error: { code, message } },
    { status: 409 }
  )
}

/** Zodバリデーションエラーを 400 レスポンスに変換する */
export function validationErrorResponse(issues: ZodIssue[]): Response {
  const details: ApiErrorDetail[] = issues.map((issue) => {
    const field = issue.path
      .map((p, i) => {
        if (typeof p === 'number') return `[${p}]`
        return i === 0 ? p : `.${p}`
      })
      .join('')
      .replace(/\.\[/g, '[')

    const code = issue.message
    return {
      field,
      code,
      message: ERROR_MESSAGES[code] ?? code,
    }
  })

  return badRequestResponse(details)
}

const ERROR_MESSAGES: Record<string, string> = {
  // ログイン
  'L-01': 'メールアドレスを入力してください',
  'L-02': 'メールアドレスの形式が正しくありません',
  'L-03': 'パスワードを入力してください',
  'L-04': 'パスワードは8文字以上で入力してください',
  // 日報
  'RE-01': '顧客を選択してください',
  'RE-02': '訪問内容を入力してください',
  'RE-03': '訪問内容は1,000文字以内で入力してください',
  'RE-04': '訪問時刻はHH:MM形式で入力してください',
  'RE-05': '訪問時刻は00:00〜23:59の範囲で入力してください',
  'RE-07': '課題・相談は2,000文字以内で入力してください',
  'RE-08': '明日やることは2,000文字以内で入力してください',
  // コメント
  'RD-01': 'コメントを入力してください',
  'RD-02': 'コメントは1,000文字以内で入力してください',
  // 顧客
  'CE-01': '顧客名を入力してください',
  'CE-02': '顧客名は100文字以内で入力してください',
  'CE-03': '住所は200文字以内で入力してください',
  'CE-04': '電話番号は数字とハイフンのみで入力してください',
  'CE-05': '電話番号は20文字以内で入力してください',
  // 営業担当者
  'SE-01': '氏名を入力してください',
  'SE-02': '氏名は50文字以内で入力してください',
  'SE-03': 'メールアドレスを入力してください',
  'SE-04': 'メールアドレスの形式が正しくありません',
  'SE-06': 'パスワードを入力してください',
  'SE-07': 'パスワードは8文字以上で入力してください',
  'SE-08': 'パスワードには英字と数字をそれぞれ1文字以上含めてください',
  'SE-09': 'ロールを選択してください',
}
