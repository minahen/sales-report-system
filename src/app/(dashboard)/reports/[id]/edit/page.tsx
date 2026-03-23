'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import ReportForm from '@/components/common/ReportForm'
import { apiClient } from '@/lib/api-client'

interface Customer {
  id: string
  name: string
}

interface VisitRecord {
  id: string
  order: number
  customer: { id: string; name: string }
  visit_content: string
  visited_at: string | null
}

interface Report {
  id: string
  report_date: string
  status: string
  problem: string | null
  plan: string | null
  visit_records: VisitRecord[]
}

function formatDisplayDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-')
  const d = new Date(Number(year), Number(month) - 1, Number(day))
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${year}年${month}月${day}日（${days[d.getDay()]}）`
}

export default function EditReportPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const reportId = params.id
  const [report, setReport] = useState<Report | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const [reportResult, customersResult] = await Promise.all([
        apiClient.get<{ data: Report }>(`/api/daily-reports/${reportId}`),
        apiClient.get<{ data: Customer[] }>('/api/customers/select-options'),
      ])

      setLoading(false)

      if (!reportResult.ok) {
        toast.error(reportResult.error.message)
        router.push('/reports')
        return
      }

      if (!customersResult.ok) {
        toast.error('顧客一覧の取得に失敗しました')
      } else {
        setCustomers(customersResult.data.data)
      }

      const fetchedReport = reportResult.data.data
      if (fetchedReport.status !== 'draft') {
        router.push(`/reports/${reportId}`)
        return
      }

      setReport(fetchedReport)
    }
    void fetchData()
  }, [reportId, router])

  if (loading) return <p className="text-gray-500">読み込み中...</p>
  if (!report) return null

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">日報編集</h1>
      <p className="text-gray-600 mb-6">{formatDisplayDate(report.report_date)}</p>
      <ReportForm
        mode="edit"
        reportId={reportId}
        defaultDate={report.report_date}
        defaultProblem={report.problem ?? ''}
        defaultPlan={report.plan ?? ''}
        defaultVisitRecords={report.visit_records.map((vr) => ({
          id: vr.id,
          customer_id: vr.customer.id,
          visit_content: vr.visit_content,
          visited_at: vr.visited_at ?? '',
          order: vr.order,
        }))}
        customers={customers}
      />
    </div>
  )
}
