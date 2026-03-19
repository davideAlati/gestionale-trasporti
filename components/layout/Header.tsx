'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface HeaderProps {
  title?: string
}

export default function Header({ title }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="fixed top-0 left-16 right-0 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-40">
      <h1 className="text-base font-semibold text-slate-800">{title}</h1>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700">
          <Bell size={18} />
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-blue-100 text-blue-800 text-xs font-semibold">
            ST
          </AvatarFallback>
        </Avatar>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="text-slate-500 hover:text-red-500"
          title="Esci"
        >
          <LogOut size={18} />
        </Button>
      </div>
    </header>
  )
}
