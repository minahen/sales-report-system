'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import GlobalNav from '@/components/layout/GlobalNav'
import { getToken } from '@/lib/api-client'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalNav />
      <main className="container mx-auto px-4 py-6 max-w-6xl">{children}</main>
    </div>
  )
}
