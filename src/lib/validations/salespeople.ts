import { z } from 'zod'

const passwordSchema = z
  .string()
  .min(8, 'SE-07')
  .refine((val) => /[a-zA-Z]/.test(val) && /\d/.test(val), 'SE-08')

export const createSalespersonSchema = z.object({
  name: z
    .string()
    .min(1, 'SE-01')
    .max(50, 'SE-02'),
  email: z
    .string()
    .min(1, 'SE-03')
    .email('SE-04'),
  password: passwordSchema,
  role: z.enum(['salesperson', 'manager', 'admin'], {
    error: 'SE-09',
  }),
  manager_id: z.string().optional(),
})

export type CreateSalespersonInput = z.infer<typeof createSalespersonSchema>

export const updateSalespersonSchema = z.object({
  name: z
    .string()
    .min(1, 'SE-01')
    .max(50, 'SE-02'),
  email: z
    .string()
    .min(1, 'SE-03')
    .email('SE-04'),
  password: passwordSchema.optional(),
  role: z.enum(['salesperson', 'manager', 'admin'], {
    error: 'SE-09',
  }),
  manager_id: z.string().optional(),
})

export type UpdateSalespersonInput = z.infer<typeof updateSalespersonSchema>
