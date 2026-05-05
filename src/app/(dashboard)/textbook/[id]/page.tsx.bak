'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, FileText, Star, Smartphone, Volume2, Loader2 } from 'lucide-react'

type Mode = 'original' | 'highlight' | 'mobile'

export default function TextbookReaderPage() {
  const params = useParams()
  const router = useRouter()
  const [textbook, setTextbook] = useState<any>(null)
  const [mode, setMode] = useState<Mode>('original')
  const [loading, setLoading] = useState(true)
  const [aiContent, setAiContent] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    if (params.id) loadTextbook(params.id as string)
  }, [params.id])

  async function loadTextbook(id: string) {
    const { data } = await supabase.from('textbooks').select('*').eq('id', id).single()
    setTextbook(data)
    setLoading(false)
  }

  async function loadAIContent(type: 'highlight' | 'mobile') {
    if (!textbook?.content) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/reader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textbook.content, type }),
      })
      const data = await res.json()
      setAiContent(data.result ?? '')
    } catch {}
    setAiLoading(false)
  }

  function handleModeChange(newMode: Mode) {
    setMode(newMode)
    if (newMode === 'highlight' || newMode === 'mobile') {
      loadAIContent(newMode)
    }
  }

  function speak() {
    if (!textbook?.content) return
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return }
    const utter = new SpeechSynthesisUtterance(textbook.content.slice(0, 3000))
    utter.lang = 'zh-TW'; utter.rate = 0.9
    utter.onend = () => setSpeaking(false)
    window.speechSynthesis.speak(utter)
    setSpeaking(true)
  }

  const isPDF = textbook?.original_url?.toLowerCase().includes('.pdf') || 
                textbook?.original_url?.includes('application/pdf')

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',background:'#f8fafc'}}>
      <Loader2 size={32} color="#2563eb" style={{animation:'spin 1s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!textbook) return (
    <div style={{padding:'24px',textAlign:'center',color:'#64748b'}}>找不到課文</div>
  )

  const MODES = [
    { id:'original', label: isPDF ? '📄 PDF閱讀' : '📄 原始',  Icon:FileText },
    { id:'highlight', label:'⭐ 重點標注', Icon:Star },
    { id:'mobile',    label:'📱 AI排版',   Icon:Smartphone },
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#f8fafc'}}>
      {/* Header */}
      <div style={{padding:'12px 16px',background:'white',borderBottom:'1px solid #e2e8f0',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
          <button onClick={() => router.back()} style={{background:'none',border:'none',cursor:'pointer',color:'#64748b',display:'flex',alignItems:'center'}}>
            <ArrowLeft size={20}/>
          </button>
          <div style={{flex:1,minWidth:0}}>
            <p style={{fontSize:'15px',fontWeight:'700',color:'#1e293b',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{textbook.title}</p>
            <p style={{fontSize:'12px',color:'#94a3b8',margin:0}}>{textbook.subject_name} · {textbook.grade} · {textbook.semester}</p>
          </div>
          <button onClick={speak} style={{width:'36px',height:'36px',borderRadius:'10px',border:'1px solid',borderColor:speaking?'#2563eb':'#e2e8f0',background:speaking?'#eff6ff':'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:speaking?'#2563eb':'#64748b'}}>
            <Volume2 size={18}/>
          </button>
        </div>

        {/* Mode tabs */}
        <div style={{display:'flex',gap:'6px'}}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => handleModeChange(m.id as Mode)}
              style={{flex:1,padding:'8px 4px',borderRadius:'10px',border:'1.5px solid',borderColor:mode===m.id?'#2563eb':'#e2e8f0',background:mode===m.id?'#eff6ff':'white',color:mode===m.id?'#1d4ed8':'#64748b',fontSize:'12px',fontWeight:mode===m.id?'700':'500',cursor:'pointer',transition:'all 0.15s'}}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
        {/* ORIGINAL / PDF MODE */}
        {mode === 'original' && (
          <div style={{flex:1,overflow:'hidden'}}>
            {isPDF && textbook.original_url ? (
              // PDF viewer - embedded iframe
              <iframe
                src={`${textbook.original_url}#toolbar=1&navpanes=1&scrollbar=1`}
                style={{width:'100%',height:'100%',border:'none'}}
                title="PDF閱讀器"
              />
            ) : textbook.original_url && !isPDF ? (
              // Image viewer
              <div style={{overflowY:'auto',height:'100%',padding:'16px'}}>
                <img src={textbook.original_url} alt="課文" style={{width:'100%',borderRadius:'12px',boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}/>
              </div>
            ) : (
              // Text fallback
              <div style={{overflowY:'auto',height:'100%',padding:'16px'}}>
                <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'14px',padding:'20px',lineHeight:'1.8',color:'#334155',fontSize:'15px',whiteSpace:'pre-wrap'}}>
                  {textbook.content || '（尚無內容）'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* HIGHLIGHT / MOBILE MODE */}
        {(mode === 'highlight' || mode === 'mobile') && (
          <div style={{flex:1,overflowY:'auto',padding:'16px'}}>
            {aiLoading ? (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'48px',gap:'12px'}}>
                <Loader2 size={28} color="#2563eb" style={{animation:'spin 1s linear infinite'}}/>
                <p style={{color:'#64748b',fontSize:'14px',margin:0}}>{mode==='highlight'?'AI 正在標記重點…':'AI 正在重新排版…'}</p>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            ) : (
              <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'14px',padding:'20px',lineHeight:'1.9',color:'#334155',fontSize:'15px'}}>
                {(aiContent || textbook.content || '').split('\n').map((line: string, i: number) => {
                  // Bold → highlight yellow
                  const parts = line.split(/\*\*(.+?)\*\*/)
                  return (
                    <p key={i} style={{marginBottom:'8px'}}>
                      {parts.map((part, j) =>
                        j % 2 === 1
                          ? <mark key={j} style={{background: mode==='highlight'?'#fef9c3':'transparent', borderBottom: mode==='highlight'?'2px solid #eab308':'none', color:'#92400e', fontWeight:'600', borderRadius:'2px', padding:'0 2px'}}>{part}</mark>
                          : <span key={j}>{part}</span>
                      )}
                    </p>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
