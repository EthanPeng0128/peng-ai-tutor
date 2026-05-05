'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, FileText, Sparkles, Volume2, Loader2, ExternalLink, Download, Printer, RefreshCw } from 'lucide-react'

type Mode = 'original' | 'summary'

export default function TextbookReaderPage() {
  const params = useParams()
  const router = useRouter()
  const [textbook, setTextbook] = useState<any>(null)
  const [mode, setMode] = useState<Mode>('original')
  const [loading, setLoading] = useState(true)
  const [speaking, setSpeaking] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [summaryHtml, setSummaryHtml] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [hasSummary, setHasSummary] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (params.id) loadTextbook(params.id as string)
    if (typeof window !== 'undefined') {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
    }
  }, [params.id])

  async function loadTextbook(id: string) {
    const { data } = await supabase.from('textbooks').select('*').eq('id', id).single()
    setTextbook(data)
    setLoading(false)
    const { data: summaries } = await supabase.from('summary_sheets').select('html_content').eq('textbook_id', id).order('created_at', { ascending: false }).limit(1)
    if (summaries && summaries.length > 0) {
      setSummaryHtml(summaries[0].html_content)
      setHasSummary(true)
    }
  }

  async function generateSummary(regenerate = false) {
    if (!textbook?.id) return
    setSummaryLoading(true)
    try {
      const res = await fetch('/api/summary-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textbookId: textbook.id, regenerate }),
      })
      const data = await res.json()
      if (data.html) {
        setSummaryHtml(data.html)
        setHasSummary(true)
      } else {
        alert('生成失敗：\n' + JSON.stringify(data, null, 2))
      }
    } catch (e: any) {
      alert('連線失敗：' + e.message)
    }
    setSummaryLoading(false)
  }

  async function downloadPNG() {
    if (!summaryRef.current) return
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(summaryRef.current, { scale: 2, backgroundColor: '#ffffff' })
      const link = document.createElement('a')
      link.download = `${textbook.title}_重點整理.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e: any) {
      alert('下載失敗：' + e.message)
    }
  }

  function printSummary() {
    if (!summaryHtml) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write('<!DOCTYPE html><html><head><title>' + textbook.title + ' 重點整理</title><style>@media print{@page{size:landscape;margin:1cm}}body{margin:0;padding:20px;font-family:sans-serif}</style></head><body>' + summaryHtml + '<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script></body></html>')
    win.document.close()
  }

  function handleModeChange(newMode: Mode) {
    setMode(newMode)
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
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100dvh',background:'#f8fafc'}}>
      <Loader2 size={32} color="#2563eb" style={{animation:'spin 1s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!textbook) return (
    <div style={{padding:'24px',textAlign:'center',color:'#64748b'}}>找不到課文</div>
  )

  const MODES = [
    { id:'original', label: isPDF ? '📄 PDF閱讀' : '📄 原始',  Icon:FileText },
    { id:'summary',  label:'📊 重點整理圖', Icon:Sparkles },
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100dvh',background:'#f8fafc',overflow:'hidden'}}>
      <div style={{flexShrink:0,padding:'12px 16px',background:'white',borderBottom:'1px solid #e2e8f0',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
          <button onClick={() => router.back()} style={{background:'none',border:'none',cursor:'pointer',color:'#64748b',display:'flex',alignItems:'center'}}>
            <ArrowLeft size={16}/><span>返回</span>
          </button>
          <div style={{flex:1,minWidth:0}}>
            <p style={{fontSize:'15px',fontWeight:'700',color:'#1e293b',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{textbook.title}</p>
            <p style={{fontSize:'12px',color:'#94a3b8',margin:0}}>{textbook.subject_name} · {textbook.grade} · {textbook.semester}</p>
          </div>
          <button onClick={speak} style={{width:'36px',height:'36px',borderRadius:'10px',border:'1px solid',borderColor:speaking?'#2563eb':'#e2e8f0',background:speaking?'#eff6ff':'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:speaking?'#2563eb':'#64748b',flexShrink:0}}>
            <Volume2 size={18}/>
          </button>
        </div>
        <div style={{display:'flex',gap:'6px'}}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => handleModeChange(m.id as Mode)}
              style={{flex:1,padding:'8px 4px',borderRadius:'10px',border:'1.5px solid',borderColor:mode===m.id?'#2563eb':'#e2e8f0',background:mode===m.id?'#eff6ff':'white',color:mode===m.id?'#1d4ed8':'#64748b',fontSize:'13px',fontWeight:mode===m.id?'700':'500',cursor:'pointer',transition:'all 0.15s'}}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{flex:1,minHeight:0,overflow:'hidden',display:'flex',flexDirection:'column'}}>
        {mode === 'original' && (
          <div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',background:'#525659'}}>
            {isPDF && textbook.original_url ? (
              <>
                {isMobile && (
                  <div style={{flexShrink:0,padding:'8px 12px',background:'#1e293b',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px'}}>
                    <span style={{fontSize:'12px',color:'#cbd5e1'}}>📱 手機建議用瀏覽器開啟</span>
                    <a href={textbook.original_url} target="_blank" rel="noopener noreferrer"
                      style={{display:'flex',alignItems:'center',gap:'4px',padding:'6px 10px',background:'#2563eb',color:'white',borderRadius:'8px',fontSize:'12px',fontWeight:'600',textDecoration:'none'}}>
                      <ExternalLink size={14}/> 開啟
                    </a>
                  </div>
                )}
                <div style={{flex:1,minHeight:0,overflow:'auto',WebkitOverflowScrolling:'touch'}}>
                  {isMobile ? (
                    <iframe
                      src={`https://docs.google.com/viewer?url=${encodeURIComponent(textbook.original_url)}&embedded=true`}
                      style={{width:'100%',height:'100%',minHeight:'100%',border:'none',display:'block'}}
                      title="PDF閱讀器"
                      allow="fullscreen"
                    />
                  ) : (
                    <iframe
                      src={`${textbook.original_url}#toolbar=1&navpanes=1&scrollbar=1`}
                      style={{width:'100%',height:'100%',border:'none',display:'block'}}
                      title="PDF閱讀器"
                    />
                  )}
                </div>
              </>
            ) : textbook.original_url && !isPDF ? (
              <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',padding:'16px',background:'#f8fafc'}}>
                <img src={textbook.original_url} alt="課文" style={{width:'100%',borderRadius:'12px',boxShadow:'0 2px 8px rgba(0,0,0,0.1)',display:'block'}}/>
              </div>
            ) : (
              <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',padding:'16px',background:'#f8fafc'}}>
                <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'14px',padding:'20px',lineHeight:'1.8',color:'#334155',fontSize:'15px',whiteSpace:'pre-wrap'}}>
                  {textbook.content || '（尚無內容）'}
                </div>
              </div>
            )}
          </div>
        )}

        {mode === 'summary' && (
          <div style={{flex:1,minHeight:0,overflowY:'auto',WebkitOverflowScrolling:'touch',padding:'16px',background:'#f1f5f9'}}>
            {!hasSummary && !summaryLoading && (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'48px 16px',gap:'16px',background:'white',borderRadius:'14px',border:'1px solid #e2e8f0'}}>
                <Sparkles size={36} color="#a78bfa"/>
                <div style={{textAlign:'center'}}>
                  <p style={{fontSize:'16px',fontWeight:'600',color:'#1e293b',margin:'0 0 6px'}}>還沒有這課的重點整理圖</p>
                  <p style={{fontSize:'13px',color:'#64748b',margin:0}}>AI 會幫你把這課重點濃縮成一張精美的圖</p>
                </div>
                <button onClick={() => generateSummary(false)}
                  style={{padding:'12px 24px',background:'#2563eb',color:'white',border:'none',borderRadius:'10px',fontSize:'14px',fontWeight:'600',cursor:'pointer',display:'flex',alignItems:'center',gap:'8px'}}>
                  <Sparkles size={16}/> 生成重點整理圖
                </button>
              </div>
            )}

            {summaryLoading && (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'48px',gap:'12px'}}>
                <Loader2 size={28} color="#2563eb" style={{animation:'spin 1s linear infinite'}}/>
                <p style={{color:'#64748b',fontSize:'14px',margin:0}}>AI 正在為你生成精美的重點整理圖…</p>
                <p style={{color:'#94a3b8',fontSize:'12px',margin:0}}>大約需要 10~20 秒，完成後會自動存檔</p>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            )}

            {hasSummary && !summaryLoading && (
              <div>
                <div style={{display:'flex',gap:'8px',marginBottom:'12px',flexWrap:'wrap'}}>
                  <button onClick={downloadPNG}
                    style={{flex:'1 1 auto',minWidth:'100px',padding:'10px 14px',background:'white',border:'1px solid #e2e8f0',borderRadius:'10px',fontSize:'13px',fontWeight:'600',color:'#334155',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
                    <Download size={15}/> 下載 PNG
                  </button>
                  <button onClick={printSummary}
                    style={{flex:'1 1 auto',minWidth:'100px',padding:'10px 14px',background:'white',border:'1px solid #e2e8f0',borderRadius:'10px',fontSize:'13px',fontWeight:'600',color:'#334155',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
                    <Printer size={15}/> 列印
                  </button>
                  <button onClick={() => generateSummary(true)}
                    style={{flex:'1 1 auto',minWidth:'100px',padding:'10px 14px',background:'white',border:'1px solid #e2e8f0',borderRadius:'10px',fontSize:'13px',fontWeight:'600',color:'#334155',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
                    <RefreshCw size={15}/> 重新生成
                  </button>
                </div>
                <div ref={summaryRef} style={{background:'white',borderRadius:'14px',padding:'8px',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}} dangerouslySetInnerHTML={{__html: summaryHtml}}/>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
