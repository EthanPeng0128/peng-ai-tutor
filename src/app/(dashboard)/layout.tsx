'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Home, BookOpen, PenLine, Camera, BarChart2, MessageCircle, CalendarDays } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',  label: '總覽', icon: Home },
  { href: '/textbook',   label: '課本', icon: BookOpen },
  { href: '/review',     label: '複習', icon: PenLine },
  { href: '/analysis',   label: '考卷', icon: Camera },
  { href: '/study-plan', label: '計劃', icon: CalendarDays },
  { href: '/progress',   label: '進度', icon: BarChart2 },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [child, setChild] = useState<any>(null)

  useEffect(() => {
    const stored = localStorage.getItem('selectedChild')
    if (!stored) { router.push('/'); return }
    setChild(JSON.parse(stored))
  }, [])

  return (
    <div className="flex flex-col h-screen bg-slate-950 max-w-lg mx-auto">
      <header className="flex items-center gap-3 px-4 pt-3 pb-3 border-b border-slate-800/60 bg-slate-950/95 backdrop-blur sticky top-0 z-40">
        <button onClick={() => router.push('/')} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400">←</button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-sm truncate">{child?.avatar} {child?.name}</div>
          <div className="text-slate-500 text-xs">{child?.grade}</div>
        </div>
        <Link href="/chat" className={`p-2 rounded-xl transition-colors ${pathname === '/chat' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800'}`}>
          <MessageCircle size={20} />
        </Link>
      </header>
      <main className="flex-1 overflow-y-auto">{children}</main>
      <nav className="border-t border-slate-800/60 bg-slate-950/95 backdrop-blur">
        <div className="flex">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href} className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors relative ${active ? 'text-blue-400' : 'text-slate-500'}`}>
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span className="text-[9px] font-medium">{label}</span>
                {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-blue-400 rounded-full" />}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
