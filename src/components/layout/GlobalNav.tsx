'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { removeToken, getStoredUser, type StoredUser } from '@/lib/api-client'

export default function GlobalNav() {
  const router = useRouter()
  const [user, setUser] = useState<StoredUser | null>(null)
  useEffect(() => {
    setUser(getStoredUser())
  }, [])
  const role = user?.role ?? 'salesperson'

  function handleLogout() {
    removeToken()
    router.push('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-bold text-lg text-blue-700">営業日報システム</span>
        <div className="flex items-center gap-4">
          {(role === 'salesperson' || role === 'manager' || role === 'admin') && (
            <Link href="/reports" className="text-sm text-gray-700 hover:text-blue-600">
              日報（自分）
            </Link>
          )}
          {(role === 'manager' || role === 'admin') && (
            <Link href="/team-reports" className="text-sm text-gray-700 hover:text-blue-600">
              部下の日報
            </Link>
          )}
          {(role === 'manager' || role === 'admin') && (
            <Link href="/customers" className="text-sm text-gray-700 hover:text-blue-600">
              顧客マスタ
            </Link>
          )}
          {role === 'admin' && (
            <Link href="/salespeople" className="text-sm text-gray-700 hover:text-blue-600">
              営業マスタ
            </Link>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-sm text-gray-600">{user.name}</span>
        )}
        <button
          onClick={handleLogout}
          className="text-sm text-red-600 hover:text-red-800 cursor-pointer"
        >
          ログアウト
        </button>
      </div>
    </nav>
  )
}
