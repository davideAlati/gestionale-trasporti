'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  List,
  Users,
  Truck,
  Wrench,
  FolderOpen,
  ClipboardList,
  HardHat,
  UserCog,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/kanban', icon: Package, label: 'Kanban Spedizioni' },
  { href: '/spedizioni', icon: List, label: 'Spedizioni' },
  { href: '/clienti', icon: Users, label: 'Clienti' },
  { href: '/autisti', icon: HardHat, label: 'Autisti' },
  { href: '/veicoli', icon: Truck, label: 'Veicoli' },
  { href: '/manutenzioni', icon: Wrench, label: 'Manutenzioni' },
  { href: '/preventivi', icon: ClipboardList, label: 'Preventivi' },
  { href: '/documenti', icon: FolderOpen, label: 'Documenti' },
  { href: '/team', icon: UserCog, label: 'Team' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-16 bg-blue-900 flex flex-col items-center py-4 gap-1 z-50">
      <div className="text-white text-2xl mb-4">🚛</div>
      <TooltipProvider delay={0}>
        {navItems.map(({ href, icon: Icon, label }) => (
          <Tooltip key={href}>
            <TooltipTrigger
              render={
                <Link
                  href={href}
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                      ? 'bg-white text-blue-900'
                      : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                  )}
                />
              }
            >
              <Icon size={20} />
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <p>{label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </aside>
  )
}
