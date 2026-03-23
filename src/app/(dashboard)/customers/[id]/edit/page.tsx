'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import CustomerForm from '@/components/common/CustomerForm'
import { apiClient } from '@/lib/api-client'

interface Customer {
  id: string
  name: string
  address: string | null
  phone: string | null
  industry: string | null
}

export default function EditCustomerPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const result = await apiClient.get<{ data: Customer }>(`/api/customers/${params.id}`)
      setLoading(false)
      if (!result.ok) {
        toast.error(result.error.message)
        router.push('/customers')
        return
      }
      setCustomer(result.data.data)
    }
    void fetch()
  }, [params.id, router])

  if (loading) return <p className="text-gray-500">読み込み中...</p>
  if (!customer) return null

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">顧客編集</h1>
      <CustomerForm
        mode="edit"
        customerId={customer.id}
        defaultValues={{
          name: customer.name,
          address: customer.address ?? '',
          phone: customer.phone ?? '',
          industry: customer.industry ?? '',
        }}
      />
    </div>
  )
}
