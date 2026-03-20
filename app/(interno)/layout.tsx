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
      <main className="ml-16 pt-[71px] p-6">
        {children}
      </main>
    </div>
  )
}
