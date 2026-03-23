'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import ReportForm from '@/components/common/ReportForm'
import { apiClient } from '@/lib/api-client'

interface Customer {
  id: string
  name: string
}

function getTodayString() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

function formatDisplayDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-')
  const d = new Date(Number(year), Number(month) - 1, Number(day))
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${year}年${month}月${day}日（${days[d.getDay()]}）`
}

export default function NewReportPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const today = getTodayString()

  useEffect(() => {
    async function fetchCustomers() {
      const result = await apiClient.get<{ data: Customer[] }>('/api/customers/select-options')
      if (result.ok) {
        setCustomers(result.data.data)
      } else {
        toast.error('顧客一覧の取得に失敗しました')
      }
    }
    void fetchCustomers()
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">日報作成</h1>
      <p className="text-gray-600 mb-6">{formatDisplayDate(today)}</p>
      <ReportForm
        mode="create"
        defaultDate={today}
        customers={customers}
      />
    </div>
  )
}
