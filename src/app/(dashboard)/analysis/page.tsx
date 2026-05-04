'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Camera, Upload, Loader2, RotateCcw } from 'lucide-react'

export default function AnalysisPage() {
  const [childId, setChildId] = useState('')
  const [phase, setPhase] = useState<'upload'|'analyzing'|'result'>('upload')
  const [result, setResult] = useState<any>(null)
  const [imagePreview, setImagePreview] = useState<string|null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setChildId(localStorage.getItem('selectedChildId')??'') }, [])

  async function handleFile(file: File) {
    setPhase('analyzing')
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      setImagePreview(dataUrl)
      const base64 = dataUrl.split(',')[1]
      const res = await fetch('/api/analyze', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ base64, mimeType: file.type||'image/jpeg' })
      })
      const data = await res.json()
      setResult(data); setPhase('result')
      if (childId) await supabase.from('exam_analyses').insert({ child_id: childId, image_url: dataUrl, ai_analysis: data })
    }
    reader.readAsDataURL(file)
  }

  const levelConfig: any = {
    red:    { label:'嚴重不熟', bg:'bg-red-500/10',    border:'border-red-500/30',    text:'text-red-400',    dot:'bg-red-400' },
    yellow: { label:'需要加強', bg:'bg-yellow-500/10', border:'border-yellow-500/30', text:'text-yellow-400', dot:'bg-yellow-400' },
    green:  { label:'已掌握',   bg:'bg-emerald-500/10',border:'border-emerald-500/30',text:'text-emerald-400',dot:'bg-emerald-400' },
  }

  if (phase === 'upload') return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-white">📷 考卷 AI 分析</h1>
      <p className="text-slate-400 text-sm">拍下考卷，AI 自動分析弱點知識點</p>
      <input ref={fileRef} type="file" className="hidden" accept="image/*"
        onChange={e => { const f=e.target.files?.[0]; if(f) handleFile(f) }}/>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => { if(fileRef.current){fileRef.current.setAttribute('capture','environment');fileRef.current.click()} }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center gap-3 hover:border-blue-500/40">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center"><Camera size={24} className="text-blue-400"/></div>
          <div className="text-center"><p className="font-medium text-white text-sm">拍考卷</p><p className="text-xs text-slate-500">直接開啟相機</p></div>
        </button>
        <button onClick={() => { if(fileRef.current){fileRef.current.removeAttribute('capture');fileRef.current.click()} }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center gap-3 hover:border-purple-500/40">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center"><Upload size={24} className="text-purple-400"/></div>
          <div className="text-center"><p className="font-medium text-white text-sm">選圖片</p><p className="text-xs text-slate-500">從相簿選取</p></div>
        </button>
      </div>
    </div>
  )

  if (phase === 'analyzing') return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      {imagePreview && <img src={imagePreview} className="w-full max-w-xs rounded-2xl border border-slate-700 opacity-60"/>}
      <div className="text-center">
        <Loader2 size={36} className="animate-spin text-blue-400 mx-auto mb-3"/>
        <p className="text-white font-medium">AI 正在分析考卷…</p>
        <p className="text-slate-500 text-sm mt-1">辨識答對答錯、找出弱點知識點</p>
      </div>
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-white">分析結果</h1>
        <button onClick={() => {setPhase('upload');setResult(null);setImagePreview(null)}} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm">
          <RotateCcw size={14}/> 再拍
        </button>
      </div>
      <div className={"bg-slate-900 border-2 rounded-2xl p-6 text-center "+((result?.score??0)>=80?'border-emerald-500/40 bg-emerald-500/5':(result?.score??0)>=60?'border-yellow-500/40 bg-yellow-500/5':'border-red-500/40 bg-red-500/5')}>
        <p className={"text-5xl font-bold mb-2 "+((result?.score??0)>=80?'text-emerald-400':(result?.score??0)>=60?'text-yellow-400':'text-red-400')}>{result?.score??'--'}</p>
        <p className="text-slate-400 text-sm">估計分數</p>
      </div>
      {result?.weakPoints?.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-white mb-2">🗺️ 弱點地圖</h2>
          <div className="space-y-2">
            {result.weakPoints.map((wp: any, i: number) => {
              const cfg = levelConfig[wp.level] ?? levelConfig.yellow
              return (
                <div key={i} className={"border rounded-xl p-3 flex items-start gap-3 "+cfg.bg+" "+cfg.border}>
                  <div className={"w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 "+cfg.dot}/>
                  <div className="flex-1">
                    <p className={"text-sm font-medium "+cfg.text}>{wp.topic}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{wp.detail}</p>
                  </div>
                  <span className={"text-xs px-2 py-0.5 rounded-full border "+cfg.bg+" "+cfg.text+" "+cfg.border}>{cfg.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {result?.suggestions?.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-white mb-3">💡 AI 補強建議</h2>
          <div className="space-y-2">
            {result.suggestions.map((s: string, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-blue-400 text-sm font-bold mt-0.5">{i+1}.</span>
                <p className="text-sm text-slate-300">{s}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
