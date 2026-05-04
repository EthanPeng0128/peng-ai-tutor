'use client'
import { useEffect, useRef, useState } from 'react'
import { Send, Loader2 } from 'lucide-react'

type Message = { role: 'user'|'assistant'; content: string }
const MODES = [
  { value:'child', label:'孩子模式', emoji:'🧒' },
  { value:'parent', label:'家長模式', emoji:'👨‍👩‍👧' },
  { value:'teacher', label:'老師模式', emoji:'📚' },
]
const QUICK = ['幫我解釋這個概念','我今天應該複習什麼？','幫我出幾道練習題','考試快到了，怎麼安排？']

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('child')
  const [child, setChild] = useState<any>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { const s = localStorage.getItem('selectedChild'); if(s) setChild(JSON.parse(s)) }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}) }, [messages])

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')
    const newMessages: Message[] = [...messages, { role:'user', content }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const res = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ messages: newMessages, mode, childName: child?.name??'同學', childGrade: child?.grade??'國中生' })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role:'assistant', content: data.reply }])
    } catch { setMessages(prev => [...prev, { role:'assistant', content:'抱歉，發生錯誤，請再試一次。' }]) }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2 border-b border-slate-800/60">
        <div className="flex gap-2">
          {MODES.map(m => (
            <button key={m.value} onClick={() => setMode(m.value)}
              className={"flex-1 py-2 rounded-xl text-xs font-medium transition-all "+(mode===m.value?'bg-blue-600 text-white':'bg-slate-800 text-slate-400')}>
              {m.emoji} {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div>
            <div className="text-center py-8"><p className="text-4xl mb-3">🤖</p><p className="text-white font-medium">彭家 AI 家教</p></div>
            <div className="space-y-2">
              {QUICK.map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="w-full text-left bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 hover:border-slate-700">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={"flex "+(msg.role==='user'?'justify-end':'justify-start')}>
            {msg.role==='assistant' && <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">🤖</div>}
            <div className={"max-w-[85%] rounded-2xl px-4 py-3 "+(msg.role==='user'?'bg-blue-600 text-white rounded-br-sm':'bg-slate-800 text-slate-100 rounded-bl-sm')}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm mr-2">🤖</div>
            <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-blue-400"/><span className="text-slate-500 text-sm">思考中…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>
      <div className="px-4 pb-4 pt-2 border-t border-slate-800/60">
        <div className="flex gap-2 items-end">
          <textarea rows={1} className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none resize-none"
            placeholder="問問題…" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()} }}/>
          <button onClick={() => sendMessage()} disabled={!input.trim()||loading}
            className="w-11 h-11 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 flex items-center justify-center">
            <Send size={16} className="text-white"/>
          </button>
        </div>
      </div>
    </div>
  )
}
