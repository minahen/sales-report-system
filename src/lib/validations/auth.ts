import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'L-01').email('L-02'),
  password: z.string().min(1, 'L-03').min(8, 'L-04'),
})

export type LoginInput = z.infer<typeof loginSchema>
