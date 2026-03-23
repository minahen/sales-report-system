'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient } from '@/lib/api-client'

const customerSchema = z.object({
  name: z.string().min(1, '顧客名を入力してください').max(100, '顧客名は100文字以内で入力してください'),
  address: z.string().max(200, '住所は200文字以内で入力してください').optional(),
  phone: z
    .string()
    .max(20, '電話番号は20文字以内で入力してください')
    .regex(/^[\d-]*$/, '電話番号は数字とハイフンのみで入力してください')
    .optional()
    .or(z.literal('')),
  industry: z.string().optional(),
})

type CustomerFormValues = z.infer<typeof customerSchema>

interface CustomerFormProps {
  customerId?: string
  defaultValues?: CustomerFormValues
  mode: 'create' | 'edit'
}

export default function CustomerForm({ customerId, defaultValues, mode }: CustomerFormProps) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: defaultValues ?? { name: '', address: '', phone: '', industry: '' },
  })

  async function onSubmit(data: CustomerFormValues) {
    let result
    if (mode === 'create') {
      result = await apiClient.post('/api/customers', data)
    } else {
      result = await apiClient.put(`/api/customers/${customerId}`, data)
    }

    if (!result.ok) {
      toast.error(result.error.message, { duration: 5000 })
      return
    }

    toast.success('保存しました')
    router.push('/customers')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <div className="space-y-1">
        <Label htmlFor="name">顧客名 *</Label>
        <Input id="name" {...register('name')} className={errors.name ? 'border-red-500' : ''} />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="address">住所</Label>
        <Input id="address" {...register('address')} />
        {errors.address && <p className="text-xs text-red-600">{errors.address.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="phone">電話番号</Label>
        <Input id="phone" {...register('phone')} placeholder="例：03-1234-5678" />
        {errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="industry">業種</Label>
        <Input id="industry" {...register('industry')} placeholder="例：製造業" />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '保存中...' : '保存'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/customers')}>
          キャンセル
        </Button>
      </div>
    </form>
  )
}
