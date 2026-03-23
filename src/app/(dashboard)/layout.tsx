import type { ReactNode } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div>
      <nav aria-label="グローバルナビゲーション">
        {/* グローバルナビゲーション（Issue #13 UI-01 で実装） */}
      </nav>
      <main>{children}</main>
    </div>
  )
}
