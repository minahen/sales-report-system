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
  salesperson: { id: string; name: string }
  updated_at: string
}

interface Subordinate {
  id: string
  name: string
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

export default function TeamReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [subordinates, setSubordinates] = useState<Subordinate[]>([])
  const [salespersonFilter, setSalespersonFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [yearMonthFilter, setYearMonthFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSubordinates() {
      const result = await apiClient.get<{ data: Subordinate[] }>('/api/salespeople/subordinates')
      if (result.ok) setSubordinates(result.data.data)
    }
    void fetchSubordinates()
  }, [])

  const fetchReports = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (salespersonFilter !== 'all') params.set('salesperson_id', salespersonFilter)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (yearMonthFilter !== 'all') params.set('year_month', yearMonthFilter)
    params.set('per_page', '50')

    const result = await apiClient.get<{ data: Report[]; meta: { total: number } }>(
      `/api/daily-reports/team?${params}`
    )
    setLoading(false)

    if (!result.ok) {
      toast.error(result.error.message)
      return
    }
    setReports(result.data.data)
  }, [salespersonFilter, statusFilter, yearMonthFilter])

  useEffect(() => {
    void fetchReports()
  }, [fetchReports])

  const months: string[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">部下の日報一覧</h1>

      <div className="flex gap-3 mb-4">
        <Select value={salespersonFilter} onValueChange={setSalespersonFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="担当者" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全員</SelectItem>
            {subordinates.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                <th className="px-4 py-3 text-left font-medium text-gray-600">担当者</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ステータス</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">訪問件数</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="px-4 py-3">{report.report_date.replace(/-/g, '/')}</td>
                  <td className="px-4 py-3">{report.salesperson.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_COLORS[report.status]}>
                      {STATUS_LABELS[report.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{report.visit_count}件</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/reports/${report.id}`}>
                      <Button variant="outline" size="sm">
                        {report.status === 'submitted' ? '確認する' : '表示'}
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
