'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getSubjectColor, getSubjectEmoji } from '@/lib/constants'
import { Flame, Trophy, BookOpen } from 'lucide-react'
import Link from 'next/link'

const S = {
  card: { background:'white', border:'1px solid #e2e8f0', borderRadius:'16px', padding:'16px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' } as React.CSSProperties,
}

export default function DashboardPage() {
  const [child, setChild] = useState<any>(null)
  const [streak, setStreak] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const s = localStorage.getItem('selectedChild')
    if (s) { const c=JSON.parse(s); setChild(c); loadData(c.id) }
  }, [])

  async function loadData(id: string) {
    const [{ data: st }, { data: se }] = await Promise.all([
      supabase.from('study_streaks').select('*').eq('child_id', id).single(),
      supabase.from('study_sessions').select('*').eq('child_id', id).order('created_at',{ascending:false}).limit(20),
    ])
    setStreak(st); setSessions(se ?? [])
    setLoading(false)
  }

  const today = new Date()

  if (loading) return (
    <div style={{padding:'16px',display:'flex',flexDirection:'column',gap:'12px'}}>
      {[1,2,3].map(i=><div key={i} style={{height:'90px',background:'#f1f5f9',borderRadius:'16px'}}/>)}
    </div>
  )

  return (
    <div style={{padding:'16px',display:'flex',flexDirection:'column',gap:'14px',paddingBottom:'24px',background:'#f8fafc'}}>
      {/* Greeting */}
      <div style={{paddingTop:'4px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'12px'}}>
        <div style={{flex:1,minWidth:0}}>
          <p style={{color:'#64748b',fontSize:'13px',marginBottom:'4px'}}>{today.getMonth()+1}月{today.getDate()}日 · 今天也加油！</p>
          <h1 style={{fontSize:'26px',fontWeight:'800',color:'#0f172a',margin:0}}>{child?.avatar} 嗨，{child?.name}！</h1>
        </div>
        <Link href="/ai-usage" style={{flexShrink:0}}>
          <button style={{width:'44px',height:'44px',borderRadius:'50%',border:'1px solid #e2e8f0',background:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}} title="AI 用量">
            💰
          </button>
        </Link>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px'}}>
        {[
          {Icon:Flame,  color:'#ea580c', bg:'#fff7ed', border:'#fed7aa', val:streak?.current_streak??0, label:'連續天數'},
          {Icon:Trophy, color:'#d97706', bg:'#fefce8', border:'#fde68a', val:streak?.total_days??0,     label:'累計天數'},
          {Icon:BookOpen,color:'#2563eb',bg:'#eff6ff', border:'#bfdbfe', val:sessions.length,           label:'總練習'},
        ].map((s,i)=>(
          <div key={i} style={{background:s.bg,border:`1px solid ${s.border}`,borderRadius:'14px',padding:'12px',textAlign:'center'}}>
            <s.Icon size={18} color={s.color} style={{margin:'0 auto 4px',display:'block'}}/>
            <div style={{fontSize:'22px',fontWeight:'800',color:'#0f172a',lineHeight:1}}>{s.val}</div>
            <div style={{fontSize:'11px',color:'#64748b',marginTop:'4px'}}>{s.label}</div>
          </div>
        ))}
      </div>
{/* Quick actions */}
      <div>
        <h2 style={{fontSize:'13px',fontWeight:'600',color:'#64748b',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'0.05em'}}>快速開始</h2>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
          {[
            {href:'/review',   emoji:'✏️',label:'開始複習', sub:'出題練習',   bg:'#eff6ff',border:'#bfdbfe'},
            {href:'/analysis', emoji:'📷',label:'拍考卷',   sub:'AI分析弱點', bg:'#f5f3ff',border:'#ddd6fe'},
            {href:'/textbook', emoji:'📚',label:'課本資料庫',sub:'上傳課文',   bg:'#f0fdf4',border:'#bbf7d0'},
            {href:'/chat',     emoji:'🤖',label:'AI 家教',  sub:'問問題',     bg:'#fff7ed',border:'#fed7aa'},
          ].map(item=>(
            <Link key={item.href} href={item.href} style={{background:item.bg,border:`1.5px solid ${item.border}`,borderRadius:'14px',padding:'16px',textDecoration:'none',display:'block'}}>
              <div style={{fontSize:'28px',marginBottom:'8px'}}>{item.emoji}</div>
              <div style={{fontSize:'14px',fontWeight:'700',color:'#0f172a'}}>{item.label}</div>
              <div style={{fontSize:'12px',color:'#64748b',marginTop:'2px'}}>{item.sub}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
