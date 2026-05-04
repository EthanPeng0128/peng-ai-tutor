'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Plus, BookOpen, X } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [children, setChildren] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGrade, setNewGrade] = useState('國二（八年級）')
  const [newEmoji, setNewEmoji] = useState('📚')
  const GRADES = ['國一（七年級）','國二（八年級）','國三（九年級）','國小四年級','國小五年級','國小六年級']
  const EMOJIS = ['📚','🌟','🎯','🚀','💡','🎨','⚽','🎵']

  useEffect(() => { loadChildren() }, [])

  async function loadChildren() {
    const { data } = await supabase.from('children').select('*').order('created_at')
    setChildren(data ?? [])
    setLoading(false)
  }

  async function addChild() {
    if (!newName.trim()) return
    const { data } = await supabase.from('children').insert({ name: newName.trim(), grade: newGrade, avatar: newEmoji, color: '#4f7ef5' }).select().single()
    if (data) {
      const subs = [
        { child_id: data.id, name: '國語', emoji: '📖', color: '#f0b429', sort_order: 0 },
        { child_id: data.id, name: '英文', emoji: '🔤', color: '#4f7ef5', sort_order: 1 },
        { child_id: data.id, name: '數學', emoji: '📐', color: '#34d399', sort_order: 2 },
        { child_id: data.id, name: '理化', emoji: '🔬', color: '#fb923c', sort_order: 3 },
        { child_id: data.id, name: '社會', emoji: '🌏', color: '#a78bfa', sort_order: 4 },
      ]
      await supabase.from('subjects').insert(subs)
      await supabase.from('study_streaks').insert({ child_id: data.id })
      setNewName(''); setShowAdd(false); loadChildren()
    }
  }

  function selectChild(child: any) {
    localStorage.setItem('selectedChildId', child.id)
    localStorage.setItem('selectedChild', JSON.stringify(child))
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <div className="text-5xl mb-4">🏠</div>
        <h1 className="text-3xl font-bold text-white mb-1">彭家 AI 家教</h1>
        <p className="text-slate-400 text-sm">Peng Family AI Tutor Platform</p>
      </div>
      <div className="w-full max-w-md space-y-3">
        {loading && <div className="space-y-3">{[1,2].map(i=><div key={i} className="h-24 bg-slate-800 rounded-2xl animate-pulse"/>)}</div>}
        {children.map((child, i) => (
          <button key={child.id} onClick={() => selectChild(child)}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 text-left hover:border-slate-700 hover:bg-slate-800/80 transition-all group">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-slate-800 group-hover:scale-105 transition-transform">{child.avatar || '📚'}</div>
            <div className="flex-1">
              <div className="font-semibold text-white text-lg">{child.name}</div>
              <div className="text-slate-400 text-sm mt-0.5">{child.grade}</div>
            </div>
            <BookOpen size={20} className="text-slate-600 group-hover:text-slate-400 transition-colors"/>
          </button>
        ))}
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)}
            className="w-full border-2 border-dashed border-slate-700 rounded-2xl p-5 flex items-center justify-center gap-2 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-all">
            <Plus size={18}/><span className="text-sm font-medium">新增孩子</span>
          </button>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">新增孩子</h3>
              <button onClick={() => setShowAdd(false)}><X size={18} className="text-slate-400"/></button>
            </div>
            <div className="space-y-3">
              <input className="w-full bg-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 border border-slate-700 focus:border-blue-500 focus:outline-none text-sm"
                placeholder="孩子姓名" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key==='Enter'&&addChild()} autoFocus/>
              <select className="w-full bg-slate-800 rounded-xl px-4 py-2.5 text-white border border-slate-700 focus:outline-none text-sm"
                value={newGrade} onChange={e => setNewGrade(e.target.value)}>
                {GRADES.map(g=><option key={g}>{g}</option>)}
              </select>
              <div>
                <p className="text-slate-400 text-xs mb-2">選擇頭像</p>
                <div className="flex gap-2 flex-wrap">
                  {EMOJIS.map(e=>(
                    <button key={e} onClick={() => setNewEmoji(e)}
                      className={"w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all "+(newEmoji===e?'bg-blue-500/30 ring-2 ring-blue-500':'bg-slate-800 hover:bg-slate-700')}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 rounded-xl text-slate-400 hover:text-white border border-slate-700 hover:bg-slate-800 transition-all text-sm">取消</button>
                <button onClick={addChild} disabled={!newName.trim()}
                  className="flex-1 px-4 py-2 rounded-xl font-medium text-sm bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition-all">新增</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <p className="text-slate-600 text-xs mt-12">目標：考上第一志願 🎯</p>
    </div>
  )
}