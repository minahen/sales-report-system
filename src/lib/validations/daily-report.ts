import { z } from 'zod'

export const listQuerySchema = z.object({
  status: z.enum(['draft', 'submitted', 'reviewed']).optional(),
  year_month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
})

export const teamListQuerySchema = listQuerySchema.extend({
  salesperson_id: z.string().uuid().optional(),
})

export type ListQuery = z.infer<typeof listQuerySchema>
export type TeamListQuery = z.infer<typeof teamListQuerySchema>
