'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FileText, Star, Smartphone, Volume2, ArrowLeft, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

type Mode = 'original' | 'highlight' | 'mobile'

export default function TextbookReaderPage() {
  const params = useParams()
  const router = useRouter()
  const [textbook, setTextbook] = useState<any>(null)
  const [mode, setMode] = useState<Mode>('mobile')
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
    const res = await fetch('/api/reader', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: textbook.content, type }),
    })
    const data = await res.json()
    setAiContent(data.result ?? '')
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
    utter.lang = 'zh-TW'
    utter.rate = 0.9
    utter.onend = () => setSpeaking(false)
    window.speechSynthesis.speak(utter)
    setSpeaking(true)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 size={32} className="animate-spin text-blue-400" />
    </div>
  )

  if (!textbook) return (
    <div className="p-4 text-center text-slate-500">找不到課文</div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-white">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{textbook.title}</p>
            <p className="text-xs text-slate-500">{textbook.subject_name} · {textbook.grade}</p>
          </div>
          <button onClick={speak}
            className={`p-2 rounded-xl transition-colors ${speaking ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Volume2 size={18} />
          </button>
        </div>
        {/* Mode tabs */}
        <div className="flex gap-1">
          {[
            { id: 'original', label: '原始', icon: FileText },
            { id: 'highlight', label: '重點標注', icon: Star },
            { id: 'mobile', label: 'AI排版', icon: Smartphone },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => handleModeChange(id as Mode)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {mode === 'original' && (
          <div className="prose-tutor">
            {textbook.original_url && textbook.original_url.endsWith('.pdf') ? (
              <iframe src={textbook.original_url} className="w-full h-96 rounded-xl border border-slate-700" />
            ) : textbook.original_url ? (
              <img src={textbook.original_url} alt="課文" className="w-full rounded-xl" />
            ) : (
              <ReactMarkdown>{textbook.content ?? '（尚無內容）'}</ReactMarkdown>
            )}
          </div>
        )}

        {(mode === 'highlight' || mode === 'mobile') && (
          <>
            {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 size={28} className="animate-spin text-blue-400" />
                <p className="text-slate-500 text-sm">{mode === 'highlight' ? 'AI 正在標記重點…' : 'AI 正在重新排版…'}</p>
              </div>
            ) : (
              <div className={`prose-tutor ${mode === 'highlight' ? 'highlight-mode' : 'mobile-mode'}`}>
                <ReactMarkdown
                  components={{
                    strong: ({ children }) => (
                      <mark className={mode === 'highlight' ? 'highlight-yellow' : 'font-bold text-yellow-400 not-italic bg-transparent'}>
                        {children}
                      </mark>
                    ),
                    em: ({ children }) => (
                      <mark className={mode === 'highlight' ? 'highlight-red' : 'font-semibold text-red-400 not-italic bg-transparent'}>
                        {children}
                      </mark>
                    ),
                  }}
                >
                  {aiContent || textbook.content || ''}
                </ReactMarkdown>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
