'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Home, BookOpen, PenLine, Camera, BarChart2, MessageCircle, CalendarDays } from 'lucide-react'

const NAV = [
  { href:'/dashboard', label:'總覽',  Icon:Home },
  { href:'/textbook',  label:'課本',  Icon:BookOpen },
  { href:'/review',    label:'複習',  Icon:PenLine },
  { href:'/analysis',  label:'考卷',  Icon:Camera },
  { href:'/study-plan',label:'計劃',  Icon:CalendarDays },
  { href:'/progress',  label:'進度',  Icon:BarChart2 },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [child, setChild] = useState<any>(null)

  useEffect(() => {
    const s = localStorage.getItem('selectedChild')
    if (!s) { router.push('/'); return }
    setChild(JSON.parse(s))
  }, [])

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#f1f5f9',maxWidth:'480px',margin:'0 auto'}}>
      <header style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',background:'white',borderBottom:'1px solid #e2e8f0',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',position:'sticky',top:0,zIndex:40}}>
        <button onClick={() => router.push('/')} style={{width:'34px',height:'34px',borderRadius:'8px',border:'1px solid #e2e8f0',background:'#f8fafc',cursor:'pointer',color:'#64748b',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center'}}>←</button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:'700',color:'#0f172a',fontSize:'15px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{child?.avatar} {child?.name}</div>
          <div style={{color:'#94a3b8',fontSize:'11px'}}>{child?.grade}</div>
        </div>
        <Link href="/chat" style={{width:'34px',height:'34px',borderRadius:'8px',border:'1px solid',borderColor:pathname==='/chat'?'#2563eb':'#e2e8f0',background:pathname==='/chat'?'#eff6ff':'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',color:pathname==='/chat'?'#2563eb':'#64748b',textDecoration:'none'}}>
          <MessageCircle size={17}/>
        </Link>
      </header>

      <main style={{flex:1,overflowY:'auto',background:'#f8fafc'}}>{children}</main>

      <nav style={{background:'white',borderTop:'1px solid #e2e8f0',boxShadow:'0 -2px 8px rgba(0,0,0,0.05)'}}>
        <div style={{display:'flex'}}>
          {NAV.map(({href,label,Icon}) => {
            const active = pathname===href
            return (
              <Link key={href} href={href} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',padding:'8px 0 6px',gap:'2px',textDecoration:'none',color:active?'#2563eb':'#94a3b8',borderTop:`2px solid ${active?'#2563eb':'transparent'}`,background:active?'#eff6ff':'transparent',transition:'all 0.15s'}}>
                <Icon size={19} strokeWidth={active?2.5:2}/>
                <span style={{fontSize:'9px',fontWeight:active?'700':'500'}}>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
