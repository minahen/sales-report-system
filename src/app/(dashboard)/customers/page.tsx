'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { apiClient, getStoredUser } from '@/lib/api-client'

interface Customer {
  id: string
  name: string
  address: string | null
  phone: string | null
  industry: string | null
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [keyword, setKeyword] = useState('')
  const [industryFilter, setIndustryFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)

  const user = getStoredUser()
  const isAdmin = user?.role === 'admin'

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (keyword) params.set('keyword', keyword)
    if (industryFilter !== 'all') params.set('industry', industryFilter)
    params.set('per_page', '100')

    const result = await apiClient.get<{ data: Customer[] }>(`/api/customers?${params}`)
    setLoading(false)

    if (!result.ok) {
      toast.error(result.error.message)
      return
    }
    setCustomers(result.data.data)
  }, [keyword, industryFilter])

  useEffect(() => {
    void fetchCustomers()
  }, [fetchCustomers])

  async function handleDelete(customer: Customer) {
    const result = await apiClient.delete(`/api/customers/${customer.id}`)
    if (!result.ok) {
      toast.error(result.error.message, { duration: 5000 })
      return
    }
    toast.success('顧客を削除しました')
    setCustomers((prev) => prev.filter((c) => c.id !== customer.id))
    setDeleteTarget(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">顧客マスタ</h1>
        {isAdmin && (
          <Link href="/customers/new">
            <Button>＋ 新規顧客を登録</Button>
          </Link>
        )}
      </div>

      <div className="flex gap-3 mb-4">
        <Input
          type="text"
          placeholder="キーワード（顧客名）"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-48"
        />
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="業種" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="製造業">製造業</SelectItem>
            <SelectItem value="IT">IT</SelectItem>
            <SelectItem value="商社">商社</SelectItem>
            <SelectItem value="金融">金融</SelectItem>
            <SelectItem value="その他">その他</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchCustomers}>検索</Button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">読み込み中...</p>
      ) : customers.length === 0 ? (
        <p className="text-gray-500 text-sm">顧客が見つかりません</p>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">顧客名</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">業種</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">電話番号</th>
                {isAdmin && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-4 py-3">{customer.name}</td>
                  <td className="px-4 py-3">{customer.industry ?? '-'}</td>
                  <td className="px-4 py-3">{customer.phone ?? '-'}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right flex gap-2 justify-end">
                      <Link href={`/customers/${customer.id}/edit`}>
                        <Button variant="outline" size="sm">編集</Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTarget(customer)}
                      >
                        削除
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="顧客を削除しますか？"
        description={`「${deleteTarget?.name}」を削除します。この操作は取り消せません。`}
        confirmLabel="削除する"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
