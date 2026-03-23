import { z } from 'zod'

/** 訪問時刻の検証: HH:MM形式かつ00:00〜23:59の範囲 */
const visitedAtSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'RE-04')
  .refine((val) => {
    const [h, m] = val.split(':').map(Number)
    return h >= 0 && h <= 23 && m >= 0 && m <= 59
  }, 'RE-05')

/** 訪問記録の1行 */
const visitRecordSchema = z.object({
  customer_id: z.string().min(1, 'RE-01'),
  visit_content: z
    .string()
    .min(1, 'RE-02')
    .max(1000, 'RE-03'),
  visited_at: visitedAtSchema.optional().or(z.literal('').transform(() => undefined)),
  order: z.number().int(),
})

/** 日報作成スキーマ */
export const createReportSchema = z
  .object({
    report_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'report_dateはYYYY-MM-DD形式で指定してください'),
    status: z.enum(['draft', 'submitted']),
    problem: z.string().max(2000, 'RE-07').optional(),
    plan: z.string().max(2000, 'RE-08').optional(),
    visit_records: z.array(visitRecordSchema).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'submitted' && (!data.visit_records || data.visit_records.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'RE-06',
        path: ['visit_records'],
      })
    }
  })

export type CreateReportInput = z.infer<typeof createReportSchema>

/** 日報更新スキーマ */
export const updateReportSchema = createReportSchema

export type UpdateReportInput = z.infer<typeof updateReportSchema>
