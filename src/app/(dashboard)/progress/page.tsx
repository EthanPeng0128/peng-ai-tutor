'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getSubjectColor, getSubjectEmoji } from '@/lib/constants'
import { Flame, BookOpen, AlertCircle, Trophy, Send } from 'lucide-react'
import { format, subDays } from 'date-fns'

export default function ProgressPage() {
  const [childId, setChildId] = useState('')
  const [child, setChild] = useState<any>(null)
  const [streak, setStreak] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [wrongAnswers, setWrongAnswers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState('')
  const [generatingReport, setGeneratingReport] = useState(false)
  const [showReport, setShowReport] = useState(false)

  useEffect(() => {
    const id = localStorage.getItem('selectedChildId') ?? ''
    const c = localStorage.getItem('selectedChild')
    setChildId(id)
    if (c) setChild(JSON.parse(c))
    if (id) loadData(id)
  }, [])

  async function loadData(id: string) {
    const [{ data: streakData }, { data: sessionData }, { data: wrongData }] = await Promise.all([
      supabase.from('study_streaks').select('*').eq('child_id', id).single(),
      supabase.from('study_sessions').select('*').eq('child_id', id).order('created_at', { ascending: false }).limit(50),
      supabase.from('wrong_answers').select('*').eq('child_id', id).eq('mastered', false).order('created_at', { ascending: false }).limit(20),
    ])
    setStreak(streakData); setSessions(sessionData ?? []); setWrongAnswers(wrongData ?? [])
    setLoading(false)
  }

  async function generateWeeklyReport() {
    setGeneratingReport(true); setShowReport(true)
    const subjectStats = ['國語','英文','數學','理化','社會'].map(name => {
      const s = sessions.filter(s => s.subject_name === name && s.score != null)
      return { name, avgScore: s.length > 0 ? Math.round(s.reduce((a,x)=>a+x.score,0)/s.length) : null, count: s.length }
    }).filter(s => s.count > 0)

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: `請幫我生成一份中文家長週報，格式要清楚易讀：
孩子：${child?.name}（${child?.grade}）
學習統計：
- 本週學習次數：${sessions.filter(s => new Date(s.created_at) > subDays(new Date(), 7)).length} 次
- 連續學習天數：${streak?.current_streak ?? 0} 天
- 各科平均分數：${subjectStats.map(s => `${s.name}${s.avgScore}分`).join('、')}
- 待複習錯題：${wrongAnswers.length} 題

請包含：
1. 本週學習總結（2-3句）
2. 各科表現分析
3. 需要加強的地方
4. 給孩子的鼓勵話語
5. 給家長的建議

用繁體中文，語氣溫暖專業。`
        }],
        mode: 'parent',
        childName: child?.name ?? '孩子',
        childGrade: child?.grade ?? '國中生',
      }),
    })
    const data = await res.json()
    setReport(data.reply ?? '')
    setGeneratingReport(false)
  }

  async function markMastered(id: string) {
    await supabase.from('wrong_answers').update({ mastered: true }).eq('id', id)
    setWrongAnswers(prev => prev.filter(w => w.id !== id))
  }

  const subjectStats = ['國語','英文','數學','理化','社會'].map(name => {
    const s = sessions.filter(s => s.subject_name === name && s.score != null)
    return { name, avgScore: s.length > 0 ? Math.round(s.reduce((a,x)=>a+x.score,0)/s.length) : null, count: s.length }
  })

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const count = sessions.filter(s => s.created_at.startsWith(dateStr)).length
    return { date, count }
  })

  if (loading) return <div className="p-4 space-y-4">{[1,2,3].map(i=><div key={i} className="skeleton h-32 rounded-2xl"/>)}</div>

  return (
    <div className="p-4 space-y-4 animate-in pb-6">
      <h1 className="text-lg font-bold text-white">📊 學習進度</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-orange-400 mb-1"><Flame size={16}/><span className="font-bold text-lg">{streak?.current_streak ?? 0}</span></div>
          <p className="text-slate-500 text-xs">連續天數</p>
        </div>
        <div className="card p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-yellow-400 mb-1"><Trophy size={16}/><span className="font-bold text-lg">{streak?.longest_streak ?? 0}</span></div>
          <p className="text-slate-500 text-xs">最長連續</p>
        </div>
        <div className="card p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-blue-400 mb-1"><BookOpen size={16}/><span className="font-bold text-lg">{sessions.length}</span></div>
          <p className="text-slate-500 text-xs">總練習次</p>
        </div>
      </div>

      {/* 7-day calendar */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-white mb-3">最近 7 天</h2>
        <div className="flex gap-2">
          {last7Days.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-full aspect-square rounded-lg flex items-center justify-center text-xs font-medium ${day.count > 0 ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-600'}`}>
                {day.count > 0 ? day.count : ''}
              </div>
              <span className="text-[10px] text-slate-600">{format(day.date, 'E').replace('Mon','一').replace('Tue','二').replace('Wed','三').replace('Thu','四').replace('Fri','五').replace('Sat','六').replace('Sun','日')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subject performance */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-white mb-4">各科表現</h2>
        <div className="space-y-4">
          {subjectStats.map(s => (
            <div key={s.name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-slate-300 flex items-center gap-1.5">
                  <span>{getSubjectEmoji(s.name)}</span><span>{s.name}</span>
                  <span className="text-slate-600 text-xs">({s.count}次)</span>
                </span>
                <span className="text-sm font-medium" style={{ color: getSubjectColor(s.name) }}>
                  {s.avgScore != null ? `${s.avgScore}分` : '--'}
                </span>
              </div>
              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.avgScore ?? 0}%`, backgroundColor: getSubjectColor(s.name) }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Wrong answers book */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <AlertCircle size={14} className="text-red-400" /> 錯題本
          </h2>
          <span className="text-xs text-slate-500">{wrongAnswers.length} 題待複習</span>
        </div>
        {wrongAnswers.length === 0 ? (
          <div className="card p-6 text-center text-slate-500 text-sm"><p className="text-2xl mb-2">🎉</p><p>暫時沒有錯題！</p></div>
        ) : (
          <div className="space-y-2">
            {wrongAnswers.slice(0, 8).map(wa => (
              <div key={wa.id} className="card p-4">
                <div className="flex items-start gap-2">
                  <span className="text-lg">{getSubjectEmoji(wa.subject_name ?? '')}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 line-clamp-2">{wa.question}</p>
                    <p className="text-xs text-emerald-400 mt-1">✓ {wa.correct_answer}</p>
                  </div>
                  <button onClick={() => markMastered(wa.id)} className="text-xs text-slate-500 hover:text-emerald-400 transition-colors flex-shrink-0 mt-1 px-2 py-1 rounded-lg hover:bg-emerald-500/10">
                    已熟
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly report */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">📋 家長週報</h2>
          <button onClick={generateWeeklyReport} disabled={generatingReport}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
            <Send size={12} /> {generatingReport ? '生成中…' : '生成週報'}
          </button>
        </div>
        {showReport && (
          <div className="prose-tutor text-sm border-t border-slate-800 pt-3">
            {generatingReport ? (
              <div className="flex items-center gap-2 text-slate-500"><div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"/><span>AI 正在生成週報…</span></div>
            ) : (
              <div className="whitespace-pre-wrap text-slate-300 leading-relaxed text-xs">{report}</div>
            )}
          </div>
        )}
        {!showReport && <p className="text-slate-500 text-xs">點擊生成本週學習報告，可分享給家長</p>}
      </div>
    </div>
  )
}
