import { z } from 'zod'

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'RD-01')
    .max(1000, 'RD-02'),
})

export type CreateCommentInput = z.infer<typeof createCommentSchema>
