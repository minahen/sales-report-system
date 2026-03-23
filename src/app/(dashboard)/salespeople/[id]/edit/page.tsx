'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import SalespersonForm from '@/components/common/SalespersonForm'
import { apiClient } from '@/lib/api-client'

interface Salesperson {
  id: string
  name: string
  email: string
  role: 'salesperson' | 'manager' | 'admin'
  manager: { id: string; name: string } | null
}

export default function EditSalespersonPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [salesperson, setSalesperson] = useState<Salesperson | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const result = await apiClient.get<{ data: Salesperson }>(`/api/salespeople/${params.id}`)
      setLoading(false)
      if (!result.ok) {
        toast.error(result.error.message)
        router.push('/salespeople')
        return
      }
      setSalesperson(result.data.data)
    }
    void fetch()
  }, [params.id, router])

  if (loading) return <p className="text-gray-500">読み込み中...</p>
  if (!salesperson) return null

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">担当者編集</h1>
      <SalespersonForm
        mode="edit"
        salespersonId={salesperson.id}
        defaultValues={{
          name: salesperson.name,
          email: salesperson.email,
          role: salesperson.role,
          manager_id: salesperson.manager?.id ?? '',
        }}
      />
    </div>
  )
}
