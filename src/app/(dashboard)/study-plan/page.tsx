'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Loader2, X, ChevronRight } from 'lucide-react'
import { getSubjectColor } from '@/lib/constants'

const SUBJECTS = ['國語','英文','數學','理化','社會']

export default function StudyPlanPage() {
  const [childId, setChildId] = useState('')
  const [plans, setPlans] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [examName, setExamName] = useState('')
  const [examDate, setExamDate] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [weakSubjects, setWeakSubjects] = useState<string[]>([])

  useEffect(() => { const id=localStorage.getItem('selectedChildId')??''; setChildId(id); if(id) loadPlans(id) }, [])

  async function loadPlans(id: string) {
    const { data } = await supabase.from('study_plans').select('*').eq('child_id', id).order('created_at', { ascending: false })
    setPlans(data ?? [])
  }

  async function generatePlan() {
    if (!examName || !examDate || selectedSubjects.length === 0) return
    setGenerating(true)
    try {
      const res = await fetch('/api/study-plan', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ examName, examDate, subjects: selectedSubjects, weakSubjects, blockedTimes: [] })
      })
      const data = await res.json()
      const { data: saved } = await supabase.from('study_plans').insert({
        child_id: childId, exam_name: examName, exam_date: examDate,
        subjects: selectedSubjects.map(s => ({ name:s, color:getSubjectColor(s) })),
        daily_plans: data.plans, status:'active',
      }).select().single()
      setShowCreate(false); loadPlans(childId)
      if (saved) setSelectedPlan(saved)
    } catch { alert('生成失敗') }
    setGenerating(false)
  }

  if (selectedPlan) {
    const daysLeft = Math.ceil((new Date(selectedPlan.exam_date).getTime()-Date.now())/(1000*60*60*24))
    return (
      <div className="p-4 space-y-4">
        <button onClick={() => setSelectedPlan(null)} className="text-blue-400 text-sm">← 返回</button>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-start justify-between">
          <div><h2 className="font-bold text-white">{selectedPlan.exam_name}</h2>
            <p className="text-slate-400 text-sm mt-1">{selectedPlan.exam_date}</p></div>
          <div className={"px-3 py-1.5 rounded-xl text-sm font-bold "+(daysLeft<=7?'bg-red-500/20 text-red-400':'bg-blue-500/20 text-blue-400')}>
            還有 {daysLeft} 天
          </div>
        </div>
        <div className="space-y-3">
          {(selectedPlan.daily_plans??[]).slice(0,14).map((plan: any, i: number) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-sm font-semibold text-white mb-2">{plan.date}</p>
              {plan.note && <p className="text-xs text-blue-400 mb-2">💡 {plan.note}</p>}
              <div className="space-y-1.5">
                {(plan.tasks??[]).map((task: any, j: number) => (
                  <div key={j} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:getSubjectColor(task.subject)}}/>
                    <p className="text-xs text-slate-300 flex-1">{task.subject}：{task.content}</p>
                    <span className="text-xs text-slate-600">{task.duration}分</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">📅 讀書計劃</h1>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-2 rounded-xl transition-colors">
          <Plus size={16}/> 新增
        </button>
      </div>
      {plans.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <p className="text-4xl mb-3">📅</p><p className="text-slate-400 text-sm">還沒有讀書計劃</p>
          <button onClick={() => setShowCreate(true)} className="mt-4 text-blue-400 text-sm">建立第一個計劃 →</button>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => {
            const d = Math.ceil((new Date(plan.exam_date).getTime()-Date.now())/(1000*60*60*24))
            return (
              <button key={plan.id} onClick={() => setSelectedPlan(plan)}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 text-left hover:border-slate-700 transition-all">
                <div className={"w-12 h-12 rounded-xl flex flex-col items-center justify-center "+(d<=7?'bg-red-500/20':'bg-blue-500/20')}>
                  <span className={"font-bold text-lg leading-none "+(d<=7?'text-red-400':'text-blue-400')}>{Math.max(0,d)}</span>
                  <span className="text-[10px] text-slate-500">天</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white text-sm">{plan.exam_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{plan.exam_date}</p>
                  <div className="flex gap-1 mt-1.5">
                    {(plan.subjects??[]).map((s: any) => (
                      <span key={s.name} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{backgroundColor:s.color+'20',color:s.color}}>{s.name}</span>
                    ))}
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-600"/>
              </button>
            )
          })}
        </div>
      )}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg mx-auto bg-slate-900 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-white text-lg">建立讀書計劃</h2>
              <button onClick={() => setShowCreate(false)}><X size={20} className="text-slate-400"/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1">考試名稱</label>
                <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="例：二段考" value={examName} onChange={e => setExamName(e.target.value)}/>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">考試日期</label>
                <input type="date" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  value={examDate} onChange={e => setExamDate(e.target.value)}/>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-2">考試科目</label>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS.map(s => (
                    <button key={s} onClick={() => setSelectedSubjects(prev => prev.includes(s)?prev.filter(x=>x!==s):[...prev,s])}
                      className={"px-3 py-1.5 rounded-xl text-sm transition-all "+(selectedSubjects.includes(s)?'bg-blue-600 text-white':'bg-slate-800 text-slate-400')}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-2">需要加強（優先排前）</label>
                <div className="flex flex-wrap gap-2">
                  {selectedSubjects.map(s => (
                    <button key={s} onClick={() => setWeakSubjects(prev => prev.includes(s)?prev.filter(x=>x!==s):[...prev,s])}
                      className={"px-3 py-1.5 rounded-xl text-sm transition-all "+(weakSubjects.includes(s)?'bg-red-500/30 text-red-300 border border-red-500/40':'bg-slate-800 text-slate-400')}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={generatePlan} disabled={!examName||!examDate||selectedSubjects.length===0||generating}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
                {generating?<><Loader2 size={16} className="animate-spin"/>AI 生成中…</>:'🚀 生成讀書計劃'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
