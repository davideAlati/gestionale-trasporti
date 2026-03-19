import React from 'react'
export const dynamic = 'force-dynamic'

import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default function InternoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Header />
      <main className="ml-16 pt-14 p-6">
        {children}
      </main>
    </div>
  )
}
