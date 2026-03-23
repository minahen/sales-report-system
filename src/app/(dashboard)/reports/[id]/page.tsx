'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { apiClient, getStoredUser } from '@/lib/api-client'

interface VisitRecord {
  id: string
  order: number
  customer: { id: string; name: string }
  visit_content: string
  visited_at: string | null
}

interface Comment {
  id: string
  content: string
  commenter: { id: string; name: string }
  created_at: string
}

interface Report {
  id: string
  report_date: string
  status: 'draft' | 'submitted' | 'reviewed'
  problem: string | null
  plan: string | null
  salesperson: { id: string; name: string }
  visit_records: VisitRecord[]
  comments: Comment[]
}

const STATUS_LABELS: Record<string, string> = {
  draft: '下書き',
  submitted: '提出済',
  reviewed: '確認済',
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function ReportDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const reportId = params.id
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [commentContent, setCommentContent] = useState('')
  const [commentError, setCommentError] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [markingReviewed, setMarkingReviewed] = useState(false)

  const user = getStoredUser()
  const isManager = user?.role === 'manager' || user?.role === 'admin'

  useEffect(() => {
    async function fetchReport() {
      const result = await apiClient.get<{ data: Report }>(`/api/daily-reports/${reportId}`)
      setLoading(false)

      if (!result.ok) {
        toast.error(result.error.message)
        router.push('/reports')
        return
      }
      setReport(result.data.data)
    }
    void fetchReport()
  }, [reportId, router])

  async function handleCommentSubmit() {
    if (!commentContent.trim()) {
      setCommentError('コメントを入力してください')
      return
    }
    if (commentContent.length > 1000) {
      setCommentError(`コメントは1,000文字以内で入力してください（現在 ${commentContent.length} 文字）`)
      return
    }
    setCommentError('')
    setSubmittingComment(true)

    const result = await apiClient.post<{ data: Comment }>(
      `/api/daily-reports/${reportId}/comments`,
      { content: commentContent }
    )
    setSubmittingComment(false)

    if (!result.ok) {
      toast.error(result.error.message)
      return
    }

    setReport((prev) =>
      prev ? { ...prev, comments: [...prev.comments, result.data.data] } : null
    )
    setCommentContent('')
    toast.success('コメントを投稿しました')
  }

  async function handleMarkReviewed() {
    setMarkingReviewed(true)
    const result = await apiClient.patch(`/api/daily-reports/${reportId}/review`)
    setMarkingReviewed(false)

    if (!result.ok) {
      toast.error(result.error.message, { duration: 5000 })
      return
    }

    setReport((prev) => (prev ? { ...prev, status: 'reviewed' } : null))
    toast.success('確認済みにしました')
  }

  if (loading) return <p className="text-gray-500">読み込み中...</p>
  if (!report) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">日報詳細</h1>
          <p className="text-gray-600 mt-1">
            {report.salesperson.name} / {report.report_date.replace(/-/g, '/')}
          </p>
        </div>
        <Badge variant={report.status === 'reviewed' ? 'outline' : 'default'}>
          ステータス: {STATUS_LABELS[report.status]}
        </Badge>
      </div>

      {/* 訪問記録 */}
      <section className="mb-6">
        <h2 className="text-base font-semibold mb-3">■ 訪問記録</h2>
        {report.visit_records.length === 0 ? (
          <p className="text-gray-500 text-sm">訪問記録なし</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left w-8">#</th>
                  <th className="px-3 py-2 text-left">顧客名</th>
                  <th className="px-3 py-2 text-left">訪問内容</th>
                  <th className="px-3 py-2 text-left w-20">訪問時刻</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.visit_records.map((vr) => (
                  <tr key={vr.id}>
                    <td className="px-3 py-2 text-gray-500">{vr.order}</td>
                    <td className="px-3 py-2">{vr.customer.name}</td>
                    <td className="px-3 py-2 whitespace-pre-wrap">{vr.visit_content}</td>
                    <td className="px-3 py-2">{vr.visited_at ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Problem */}
      <section className="mb-6">
        <h2 className="text-base font-semibold mb-2">■ 課題・相談（Problem）</h2>
        <div className="bg-gray-50 rounded p-3 text-sm whitespace-pre-wrap min-h-[60px]">
          {report.problem || <span className="text-gray-400">（なし）</span>}
        </div>
      </section>

      {/* Plan */}
      <section className="mb-6">
        <h2 className="text-base font-semibold mb-2">■ 明日やること（Plan）</h2>
        <div className="bg-gray-50 rounded p-3 text-sm whitespace-pre-wrap min-h-[60px]">
          {report.plan || <span className="text-gray-400">（なし）</span>}
        </div>
      </section>

      {/* コメント */}
      <section className="mb-6">
        <h2 className="text-base font-semibold mb-3">■ 上長コメント</h2>
        {report.comments.length === 0 ? (
          <p className="text-gray-500 text-sm">コメントはまだありません</p>
        ) : (
          <div className="space-y-3">
            {report.comments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{comment.commenter.name}</span>
                  <span className="text-xs text-gray-500">{formatDateTime(comment.created_at)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))}
          </div>
        )}

        {isManager && (
          <div className="mt-4 space-y-2">
            <Label htmlFor="comment-input">コメントを入力</Label>
            <div className="relative">
              <Textarea
                id="comment-input"
                value={commentContent}
                onChange={(e) => {
                  setCommentContent(e.target.value)
                  setCommentError('')
                }}
                placeholder="コメントを入力..."
                rows={3}
                className={commentError ? 'border-red-500' : ''}
              />
              <span className="text-xs text-gray-400 absolute bottom-1 right-2">
                {commentContent.length}/1000
              </span>
            </div>
            {commentError && (
              <p className="text-xs text-red-600" role="alert">{commentError}</p>
            )}
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={handleCommentSubmit}
                disabled={submittingComment}
              >
                コメントを投稿する
              </Button>
              {report.status === 'submitted' && (
                <Button
                  onClick={handleMarkReviewed}
                  disabled={markingReviewed}
                >
                  確認済にする
                </Button>
              )}
            </div>
          </div>
        )}
      </section>

      <div className="flex gap-3">
        <Link href="/reports">
          <Button variant="outline">一覧に戻る</Button>
        </Link>
      </div>
    </div>
  )
}
