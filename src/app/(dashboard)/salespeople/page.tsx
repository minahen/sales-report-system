'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { apiClient } from '@/lib/api-client'

interface Salesperson {
  id: string
  name: string
  email: string
  role: string
  manager: { id: string; name: string } | null
}

const ROLE_LABELS: Record<string, string> = {
  salesperson: '営業',
  manager: '上長',
  admin: '管理者',
}

export default function SalesPeoplePage() {
  const [people, setPeople] = useState<Salesperson[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Salesperson | null>(null)

  useEffect(() => {
    async function fetchPeople() {
      const result = await apiClient.get<{ data: Salesperson[] }>('/api/salespeople?per_page=100')
      setLoading(false)
      if (!result.ok) {
        toast.error(result.error.message)
        return
      }
      setPeople(result.data.data)
    }
    void fetchPeople()
  }, [])

  async function handleDelete(person: Salesperson) {
    const result = await apiClient.delete(`/api/salespeople/${person.id}`)
    if (!result.ok) {
      toast.error(result.error.message, { duration: 5000 })
      return
    }
    toast.success('担当者を削除しました')
    setPeople((prev) => prev.filter((p) => p.id !== person.id))
    setDeleteTarget(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">営業マスタ</h1>
        <Link href="/salespeople/new">
          <Button>＋ 新規担当者を登録</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">読み込み中...</p>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">氏名</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">メールアドレス</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ロール</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">上長</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {people.map((person) => (
                <tr key={person.id}>
                  <td className="px-4 py-3">{person.name}</td>
                  <td className="px-4 py-3">{person.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{ROLE_LABELS[person.role] ?? person.role}</Badge>
                  </td>
                  <td className="px-4 py-3">{person.manager?.name ?? '−'}</td>
                  <td className="px-4 py-3 text-right flex gap-2 justify-end">
                    <Link href={`/salespeople/${person.id}/edit`}>
                      <Button variant="outline" size="sm">編集</Button>
                    </Link>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTarget(person)}
                    >
                      削除
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="担当者を削除しますか？"
        description={`「${deleteTarget?.name}」を削除します。この操作は取り消せません。`}
        confirmLabel="削除する"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
