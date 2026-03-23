import { z } from 'zod'

export const createCustomerSchema = z.object({
  name: z
    .string()
    .min(1, 'CE-01')
    .max(100, 'CE-02'),
  address: z.string().max(200, 'CE-03').optional(),
  phone: z
    .string()
    .max(20, 'CE-05')
    .regex(/^[\d-]*$/, 'CE-04')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  industry: z.string().optional(),
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>

export const updateCustomerSchema = createCustomerSchema

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
