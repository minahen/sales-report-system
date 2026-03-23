'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiClient } from '@/lib/api-client'

const createSchema = z.object({
  name: z.string().min(1, '氏名を入力してください').max(50, '氏名は50文字以内で入力してください'),
  email: z.string().min(1, 'メールアドレスを入力してください').email('メールアドレスの形式が正しくありません'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), 'パスワードには英字と数字をそれぞれ1文字以上含めてください'),
  role: z.enum(['salesperson', 'manager', 'admin']),
  manager_id: z.string().optional(),
})

const editSchema = createSchema.extend({
  password: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 8, 'パスワードは8文字以上で入力してください')
    .refine(
      (v) => !v || (/[a-zA-Z]/.test(v) && /\d/.test(v)),
      'パスワードには英字と数字をそれぞれ1文字以上含めてください'
    ),
})

type EditFormValues = z.infer<typeof editSchema>

interface ManagerOption {
  id: string
  name: string
}

interface SalespersonFormProps {
  salespersonId?: string
  defaultValues?: Partial<EditFormValues>
  mode: 'create' | 'edit'
}

export default function SalespersonForm({ salespersonId, defaultValues, mode }: SalespersonFormProps) {
  const router = useRouter()
  const [managers, setManagers] = useState<ManagerOption[]>([])

  useEffect(() => {
    async function fetchManagers() {
      const result = await apiClient.get<{ data: ManagerOption[] }>('/api/salespeople/manager-options')
      if (result.ok) setManagers(result.data.data)
    }
    void fetchManagers()
  }, [])

  const schema = mode === 'create' ? createSchema : editSchema
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'salesperson',
      manager_id: '',
      ...defaultValues,
    },
  })

  const watchedRole = watch('role')
  const watchedManagerId = watch('manager_id')

  async function onSubmit(data: EditFormValues) {
    const payload: Record<string, unknown> = {
      name: data.name,
      email: data.email,
      role: data.role,
      manager_id: data.manager_id || undefined,
    }
    if (data.password) payload.password = data.password

    let result
    if (mode === 'create') {
      result = await apiClient.post('/api/salespeople', payload)
    } else {
      result = await apiClient.put(`/api/salespeople/${salespersonId}`, payload)
    }

    if (!result.ok) {
      toast.error(result.error.message, { duration: 5000 })
      return
    }

    toast.success('保存しました')
    router.push('/salespeople')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <div className="space-y-1">
        <Label htmlFor="name">氏名 *</Label>
        <Input id="name" {...register('name')} className={errors.name ? 'border-red-500' : ''} />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">メールアドレス *</Label>
        <Input id="email" type="email" {...register('email')} className={errors.email ? 'border-red-500' : ''} />
        {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">
          パスワード {mode === 'create' ? '*' : '（変更する場合のみ入力）'}
        </Label>
        <Input
          id="password"
          type="password"
          {...register('password')}
          className={errors.password ? 'border-red-500' : ''}
          placeholder={mode === 'edit' ? '空欄の場合は変更なし' : ''}
        />
        {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="role">ロール *</Label>
        <Select
          value={watchedRole}
          onValueChange={(val) => setValue('role', val as 'salesperson' | 'manager' | 'admin')}
        >
          <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
            <SelectValue placeholder="ロールを選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="salesperson">営業</SelectItem>
            <SelectItem value="manager">上長</SelectItem>
            <SelectItem value="admin">管理者</SelectItem>
          </SelectContent>
        </Select>
        {errors.role && <p className="text-xs text-red-600">{errors.role.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="manager_id">上長</Label>
        <Select
          value={watchedManagerId ?? ''}
          onValueChange={(val) => setValue('manager_id', val === 'none' ? undefined : val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="上長を選択（任意）" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">指定なし</SelectItem>
            {managers.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '保存中...' : '保存'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/salespeople')}>
          キャンセル
        </Button>
      </div>
    </form>
  )
}
