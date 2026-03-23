'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiClient } from '@/lib/api-client'

interface Report {
  id: string
  report_date: string
  status: 'draft' | 'submitted' | 'reviewed'
  visit_count: number
  updated_at: string
}

interface ReportListResponse {
  data: Report[]
  meta: { page: number; per_page: number; total: number }
}

const STATUS_LABELS: Record<string, string> = {
  draft: '下書き',
  submitted: '提出済',
  reviewed: '確認済',
}

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  submitted: 'default',
  reviewed: 'outline',
}

function formatDate(dateStr: string) {
  return dateStr.replace(/-/g, '/')
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getTodayString() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [yearMonthFilter, setYearMonthFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const today = getTodayString()

  const fetchReports = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (yearMonthFilter !== 'all') params.set('year_month', yearMonthFilter)
    params.set('per_page', '50')

    const result = await apiClient.get<ReportListResponse>(`/api/daily-reports?${params}`)
    setLoading(false)

    if (!result.ok) {
      toast.error(result.error.message)
      return
    }
    setReports(result.data.data)
    setTotal(result.data.meta.total)
  }, [statusFilter, yearMonthFilter])

  useEffect(() => {
    void fetchReports()
  }, [fetchReports])

  const hasTodayReport = reports.some((r) => r.report_date === today)

  // Generate last 12 months for filter
  const months: string[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">日報一覧</h1>
        {!hasTodayReport && (
          <Link href="/reports/new">
            <Button>＋ 今日の日報を作成</Button>
          </Link>
        )}
      </div>

      <div className="flex gap-3 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="draft">下書き</SelectItem>
            <SelectItem value="submitted">提出済</SelectItem>
            <SelectItem value="reviewed">確認済</SelectItem>
          </SelectContent>
        </Select>
        <Select value={yearMonthFilter} onValueChange={setYearMonthFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="年月" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {months.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">読み込み中...</p>
      ) : reports.length === 0 ? (
        <p className="text-gray-500 text-sm">該当する日報がありません</p>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">日付</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ステータス</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">訪問件数</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">最終更新</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="px-4 py-3">{formatDate(report.report_date)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_COLORS[report.status]}>
                      {STATUS_LABELS[report.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{report.visit_count}件</td>
                  <td className="px-4 py-3">{formatDateTime(report.updated_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {report.status === 'draft' ? (
                      <Link href={`/reports/${report.id}/edit`}>
                        <Button variant="outline" size="sm">編集</Button>
                      </Link>
                    ) : (
                      <Link href={`/reports/${report.id}`}>
                        <Button variant="outline" size="sm">表示</Button>
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 text-xs text-gray-500 border-t">
            全 {total} 件
          </div>
        </div>
      )}
    </div>
  )
}
