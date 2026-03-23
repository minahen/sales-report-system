'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiClient } from '@/lib/api-client'

interface Customer {
  id: string
  name: string
}

interface VisitRecord {
  id?: string
  customer_id: string
  visit_content: string
  visited_at: string
  order: number
}

interface ReportFormProps {
  reportId?: string
  defaultDate?: string
  defaultProblem?: string
  defaultPlan?: string
  defaultVisitRecords?: VisitRecord[]
  customers: Customer[]
  mode: 'create' | 'edit'
}

interface VisitRecordErrors {
  customer_id?: string
  visit_content?: string
  visited_at?: string
}

function getTodayString() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

export default function ReportForm({
  reportId,
  defaultDate,
  defaultProblem = '',
  defaultPlan = '',
  defaultVisitRecords = [],
  customers,
  mode,
}: ReportFormProps) {
  const router = useRouter()
  const reportDate = defaultDate ?? getTodayString()
  const [visitRecords, setVisitRecords] = useState<VisitRecord[]>(
    defaultVisitRecords.length > 0
      ? defaultVisitRecords
      : [{ customer_id: '', visit_content: '', visited_at: '', order: 1 }]
  )
  const [problem, setProblem] = useState(defaultProblem)
  const [plan, setPlan] = useState(defaultPlan)
  const [errors, setErrors] = useState<{
    visitRecords: VisitRecordErrors[]
    problem?: string
    plan?: string
    general?: string
  }>({ visitRecords: [] })
  const [submitting, setSubmitting] = useState(false)

  function addVisitRecord() {
    setVisitRecords((prev) => [
      ...prev,
      { customer_id: '', visit_content: '', visited_at: '', order: prev.length + 1 },
    ])
  }

  function removeVisitRecord(index: number) {
    if (visitRecords.length <= 1) return
    setVisitRecords((prev) => {
      const next = prev.filter((_, i) => i !== index)
      return next.map((r, i) => ({ ...r, order: i + 1 }))
    })
  }

  function updateVisitRecord(index: number, field: keyof VisitRecord, value: string) {
    setVisitRecords((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    )
  }

  function validate(forSubmit: boolean): boolean {
    const vrErrors: VisitRecordErrors[] = visitRecords.map((vr) => {
      const e: VisitRecordErrors = {}
      if (forSubmit && !vr.customer_id) e.customer_id = '顧客を選択してください'
      if (forSubmit && !vr.visit_content.trim()) e.visit_content = '訪問内容を入力してください'
      if (vr.visit_content.length > 1000)
        e.visit_content = `訪問内容は1,000文字以内で入力してください（現在 ${vr.visit_content.length} 文字）`
      if (vr.visited_at && !/^\d{2}:\d{2}$/.test(vr.visited_at)) {
        e.visited_at = '訪問時刻はHH:MM形式で入力してください'
      } else if (vr.visited_at) {
        const [h, m] = vr.visited_at.split(':').map(Number)
        if (h > 23 || m > 59) e.visited_at = '訪問時刻は00:00〜23:59の範囲で入力してください'
      }
      return e
    })

    const newErrors = {
      visitRecords: vrErrors,
      problem: problem.length > 2000
        ? `課題・相談は2,000文字以内で入力してください（現在 ${problem.length} 文字）`
        : undefined,
      plan: plan.length > 2000
        ? `明日やることは2,000文字以内で入力してください（現在 ${plan.length} 文字）`
        : undefined,
    }

    setErrors(newErrors)

    const hasVrErrors = vrErrors.some((e) => Object.keys(e).length > 0)
    return !hasVrErrors && !newErrors.problem && !newErrors.plan
  }

  async function handleSave(status: 'draft' | 'submitted') {
    if (!validate(status === 'submitted')) return

    setSubmitting(true)

    const payload = {
      report_date: reportDate,
      status,
      problem: problem || undefined,
      plan: plan || undefined,
      visit_records: visitRecords
        .filter((vr) => status === 'draft' || (vr.customer_id && vr.visit_content))
        .map((vr, i) => ({
          customer_id: vr.customer_id,
          visit_content: vr.visit_content,
          visited_at: vr.visited_at || undefined,
          order: i + 1,
        })),
    }

    let result
    if (mode === 'create') {
      result = await apiClient.post('/api/daily-reports', payload)
    } else {
      result = await apiClient.put(`/api/daily-reports/${reportId}`, payload)
    }

    setSubmitting(false)

    if (!result.ok) {
      toast.error(result.error.message, { duration: 5000 })
      return
    }

    if (status === 'submitted') {
      toast.success('提出しました')
      router.push('/reports')
    } else {
      toast.success('保存しました')
    }
  }

  const canSubmit = visitRecords.some((vr) => vr.customer_id && vr.visit_content.trim())

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-3">■ 訪問記録</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left w-8">#</th>
                <th className="px-3 py-2 text-left w-48">顧客名</th>
                <th className="px-3 py-2 text-left">訪問内容</th>
                <th className="px-3 py-2 text-left w-28">訪問時刻</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visitRecords.map((vr, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2">
                    <Select
                      value={vr.customer_id}
                      onValueChange={(val) => updateVisitRecord(i, 'customer_id', val)}
                    >
                      <SelectTrigger className={errors.visitRecords[i]?.customer_id ? 'border-red-500' : ''}>
                        <SelectValue placeholder="顧客を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.visitRecords[i]?.customer_id && (
                      <p className="text-xs text-red-600 mt-1">{errors.visitRecords[i].customer_id}</p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="relative">
                      <Textarea
                        value={vr.visit_content}
                        onChange={(e) => updateVisitRecord(i, 'visit_content', e.target.value)}
                        placeholder="訪問内容を入力..."
                        rows={2}
                        className={errors.visitRecords[i]?.visit_content ? 'border-red-500' : ''}
                      />
                      <span className="text-xs text-gray-400 absolute bottom-1 right-2">
                        {vr.visit_content.length}/1000
                      </span>
                    </div>
                    {errors.visitRecords[i]?.visit_content && (
                      <p className="text-xs text-red-600 mt-1">{errors.visitRecords[i].visit_content}</p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="text"
                      placeholder="HH:MM"
                      value={vr.visited_at}
                      onChange={(e) => updateVisitRecord(i, 'visited_at', e.target.value)}
                      className={errors.visitRecords[i]?.visited_at ? 'border-red-500' : ''}
                    />
                    {errors.visitRecords[i]?.visited_at && (
                      <p className="text-xs text-red-600 mt-1">{errors.visitRecords[i].visited_at}</p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => removeVisitRecord(i)}
                      disabled={visitRecords.length <= 1}
                      className="text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 border-t">
            <button
              type="button"
              onClick={addVisitRecord}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              ＋ 訪問記録を追加
            </button>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-base font-semibold">■ 今日の課題・相談（Problem）</Label>
        <div className="relative mt-2">
          <Textarea
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="課題・相談を入力..."
            rows={4}
            className={errors.problem ? 'border-red-500' : ''}
          />
          <span className="text-xs text-gray-400 absolute bottom-1 right-2">
            {problem.length}/2000
          </span>
        </div>
        {errors.problem && (
          <p className="text-xs text-red-600 mt-1">{errors.problem}</p>
        )}
      </div>

      <div>
        <Label className="text-base font-semibold">■ 明日やること（Plan）</Label>
        <div className="relative mt-2">
          <Textarea
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="明日やることを入力..."
            rows={4}
            className={errors.plan ? 'border-red-500' : ''}
          />
          <span className="text-xs text-gray-400 absolute bottom-1 right-2">
            {plan.length}/2000
          </span>
        </div>
        {errors.plan && (
          <p className="text-xs text-red-600 mt-1">{errors.plan}</p>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSave('draft')}
          disabled={submitting}
        >
          下書き保存
        </Button>
        <Button
          type="button"
          onClick={() => handleSave('submitted')}
          disabled={submitting || !canSubmit}
        >
          提出する
        </Button>
      </div>
    </div>
  )
}
