'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Home, BookOpen, PenLine, Camera, BarChart2, MessageCircle, CalendarDays } from 'lucide-react'

const NAV = [
  { href: '/dashboard',  label: '總覽', Icon: Home },
  { href: '/textbook',   label: '課本', Icon: BookOpen },
  { href: '/review',     label: '複習', Icon: PenLine },
  { href: '/analysis',   label: '考卷', Icon: Camera },
  { href: '/study-plan', label: '計劃', Icon: CalendarDays },
  { href: '/progress',   label: '進度', Icon: BarChart2 },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [child, setChild] = useState<any>(null)
  const [screen, setScreen] = useState<'mobile' | 'tablet' | 'desktop'>('mobile')

  useEffect(() => {
    const s = localStorage.getItem('selectedChild')
    if (!s) { router.push('/'); return }
    setChild(JSON.parse(s))

    function detectScreen() {
      const w = window.innerWidth
      if (w >= 1024) setScreen('desktop')
      else if (w >= 640) setScreen('tablet')
      else setScreen('mobile')
    }
    detectScreen()
    window.addEventListener('resize', detectScreen)
    return () => window.removeEventListener('resize', detectScreen)
  }, [])

  // ============ DESKTOP / iPad 橫式（>= 1024px）：側邊欄佈局 ============
  if (screen === 'desktop') {
    return (
      <div style={{ display: 'flex', height: '100vh', background: '#f1f5f9' }}>
        {/* 側邊欄 */}
        <aside style={{ width: '240px', background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', boxShadow: '1px 0 4px rgba(0,0,0,0.04)' }}>
          {/* 頂部：使用者資訊 */}
          <div style={{ padding: '20px 16px', borderBottom: '1px solid #e2e8f0' }}>
            <button onClick={() => router.push('/')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', overflow: 'hidden', flexShrink: 0 }}>
                {child?.avatar_url ? (
                  <img src={child.avatar_url} alt={child.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                ) : (
                  child?.avatar || '📚'
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{child?.name}</div>
                <div style={{ color: '#94a3b8', fontSize: '11px' }}>{child?.grade}</div>
              </div>
            </button>
          </div>

          {/* 導覽列表 */}
          <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {NAV.map(({ href, label, Icon }) => {
              const active = pathname === href
              return (
                <Link key={href} href={href}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', textDecoration: 'none', color: active ? '#2563eb' : '#64748b', background: active ? '#eff6ff' : 'transparent', fontWeight: active ? 700 : 500, fontSize: '14px', transition: 'all 0.15s' }}>
                  <Icon size={18} strokeWidth={active ? 2.5 : 2}/>
                  <span>{label}</span>
                </Link>
              )
            })}
          </nav>

          {/* 底部 AI Chat */}
          <div style={{ padding: '12px', borderTop: '1px solid #e2e8f0' }}>
            <Link href="/chat"
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', textDecoration: 'none', color: pathname === '/chat' ? '#2563eb' : '#64748b', background: pathname === '/chat' ? '#eff6ff' : '#f8fafc', fontWeight: 600, fontSize: '14px', border: '1px solid #e2e8f0' }}>
              <MessageCircle size={18}/>
              <span>AI 家教</span>
            </Link>
          </div>
        </aside>

        {/* 主內容區 */}
        <main style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', minHeight: '100%' }}>
            {children}
          </div>
        </main>
      </div>
    )
  }

  // ============ TABLET / iPad 直式（640~1024px）：保留底部導覽，內容區拉寬 ============
  if (screen === 'tablet') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f1f5f9', maxWidth: '720px', margin: '0 auto', boxShadow: '0 0 24px rgba(0,0,0,0.05)' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', background: 'white', borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 40 }}>
          <button onClick={() => router.push('/')}
            style={{ width: '38px', height: '38px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', color: '#64748b', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', overflow: 'hidden', flexShrink: 0 }}>
            {child?.avatar_url ? (
              <img src={child.avatar_url} alt={child.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            ) : (
              child?.avatar || '📚'
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{child?.name}</div>
            <div style={{ color: '#94a3b8', fontSize: '12px' }}>{child?.grade}</div>
          </div>
          <Link href="/chat"
            style={{ width: '38px', height: '38px', borderRadius: '10px', border: '1px solid', borderColor: pathname === '/chat' ? '#2563eb' : '#e2e8f0', background: pathname === '/chat' ? '#eff6ff' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: pathname === '/chat' ? '#2563eb' : '#64748b', textDecoration: 'none' }}>
            <MessageCircle size={18}/>
          </Link>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>{children}</main>

        <nav style={{ background: 'white', borderTop: '1px solid #e2e8f0', boxShadow: '0 -2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex' }}>
            {NAV.map(({ href, label, Icon }) => {
              const active = pathname === href
              return (
                <Link key={href} href={href}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0 8px', gap: '3px', textDecoration: 'none', color: active ? '#2563eb' : '#94a3b8', borderTop: `2px solid ${active ? '#2563eb' : 'transparent'}`, background: active ? '#eff6ff' : 'transparent', transition: 'all 0.15s' }}>
                  <Icon size={22} strokeWidth={active ? 2.5 : 2}/>
                  <span style={{ fontSize: '11px', fontWeight: active ? 700 : 500 }}>{label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    )
  }

  // ============ MOBILE / iPhone（< 640px）：原本的設計 ============
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f1f5f9', maxWidth: '480px', margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'white', borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 40 }}>
        <button onClick={() => router.push('/')}
          style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', color: '#64748b', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', overflow: 'hidden', flexShrink: 0 }}>
          {child?.avatar_url ? (
            <img src={child.avatar_url} alt={child.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          ) : (
            child?.avatar || '📚'
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{child?.name}</div>
          <div style={{ color: '#94a3b8', fontSize: '11px' }}>{child?.grade}</div>
        </div>
        <Link href="/chat"
          style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid', borderColor: pathname === '/chat' ? '#2563eb' : '#e2e8f0', background: pathname === '/chat' ? '#eff6ff' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: pathname === '/chat' ? '#2563eb' : '#64748b', textDecoration: 'none' }}>
          <MessageCircle size={17}/>
        </Link>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>{children}</main>

      <nav style={{ background: 'white', borderTop: '1px solid #e2e8f0', boxShadow: '0 -2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex' }}>
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 6px', gap: '2px', textDecoration: 'none', color: active ? '#2563eb' : '#94a3b8', borderTop: `2px solid ${active ? '#2563eb' : 'transparent'}`, background: active ? '#eff6ff' : 'transparent', transition: 'all 0.15s' }}>
                <Icon size={19} strokeWidth={active ? 2.5 : 2}/>
                <span style={{ fontSize: '9px', fontWeight: active ? 700 : 500 }}>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
