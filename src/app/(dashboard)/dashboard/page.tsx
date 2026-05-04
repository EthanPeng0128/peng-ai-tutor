'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getSubjectColor, getSubjectEmoji } from '@/lib/constants'
import { Flame, Trophy, BookOpen, Target, Zap, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [child, setChild] = useState<any>(null)
  const [streak, setStreak] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('selectedChild')
    if (stored) {
      const c = JSON.parse(stored)
      setChild(c)
      loadData(c.id)
    }
  }, [])

  async function loadData(id: string) {
    const [{ data: s }, { data: sess }, { data: p }] = await Promise.all([
      supabase.from('study_streaks').select('*').eq('child_id', id).single(),
      supabase.from('study_sessions').select('*').eq('child_id', id).order('created_at', { ascending: false }).limit(5),
      supabase.from('study_plans').select('*').eq('child_id', id).eq('status', 'active').order('exam_date').limit(3),
    ])
    setStreak(s); setSessions(sess ?? []); setPlans(p ?? [])
    setLoading(false)
  }

  const today = new Date()
  const subjectStats = ['國語','英文','數學','理化','社會'].map(name => {
    const s = sessions.filter(s => s.subject_name === name && s.score != null)
    return { name, progress: s.length > 0 ? Math.round(s.reduce((a: number,x: any)=>a+x.score,0)/s.length) : 45 }
  })

  if (loading) return <div className="p-4 space-y-4">{[1,2,3].map(i=><div key={i} className="h-28 bg-slate-800 rounded-2xl animate-pulse"/>)}</div>

  return (
    <div className="p-4 space-y-4 pb-4">
      <div className="pt-2">
        <p className="text-slate-400 text-sm">{today.getMonth()+1}月{today.getDate()}日 · 今天也加油！</p>
        <h1 className="text-2xl font-bold text-white mt-1">嗨，{child?.name} {child?.avatar}</h1>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Flame size={16}/>, color: 'text-orange-400', value: streak?.current_streak??0, label: '連續天數' },
          { icon: <Trophy size={16}/>, color: 'text-yellow-400', value: streak?.total_days??0, label: '累計天數' },
          { icon: <Target size={16}/>, color: 'text-blue-400', value: sessions.length>0?Math.round(sessions.reduce((a,s)=>a+(s.score??0),0)/sessions.length):'--', label: '近期均分' },
        ].map((s,i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center">
            <div className={"flex items-center justify-center gap-1 mb-1 "+s.color}>{s.icon}<span className="font-bold text-lg">{s.value}</span></div>
            <p className="text-slate-500 text-xs">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">各科進度</h2>
          <Link href="/progress" className="text-blue-400 text-xs">查看詳情 →</Link>
        </div>
        <div className="space-y-3">
          {subjectStats.map(s => (
            <div key={s.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-300">{getSubjectEmoji(s.name)} {s.name}</span>
                <span className="text-xs text-slate-500">{s.progress}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{width:s.progress+'%',backgroundColor:getSubjectColor(s.name)}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold text-slate-400 mb-2">快速開始</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href:'/review', emoji:'✏️', label:'開始複習', sub:'出題練習', color:'bg-blue-500/10 border-blue-500/20' },
            { href:'/analysis', emoji:'📷', label:'拍考卷', sub:'AI分析弱點', color:'bg-purple-500/10 border-purple-500/20' },
            { href:'/textbook', emoji:'📚', label:'課本資料庫', sub:'上傳課文', color:'bg-emerald-500/10 border-emerald-500/20' },
            { href:'/chat', emoji:'🤖', label:'AI 家教', sub:'問問題', color:'bg-orange-500/10 border-orange-500/20' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className={"bg-slate-900 border rounded-2xl p-4 "+item.color+" hover:scale-[1.02] transition-transform active:scale-95"}>
              <div className="text-2xl mb-2">{item.emoji}</div>
              <div className="font-medium text-white text-sm">{item.label}</div>
              <div className="text-slate-500 text-xs">{item.sub}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
