import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'L-01' })
    .email({ message: 'L-02' }),
  password: z
    .string()
    .min(1, { message: 'L-03' })
    .min(8, { message: 'L-04' }),
})

export type LoginInput = z.infer<typeof loginSchema>
