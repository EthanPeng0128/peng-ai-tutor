'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { QUIZ_MODES, DIFFICULTY_LEVELS, getSubjectEmoji } from '@/lib/constants'
import { ChevronRight, Loader2, RotateCcw, AlertCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

type Phase = 'select' | 'configure' | 'loading' | 'result'

export default function ReviewPage() {
  const [childId, setChildId] = useState('')
  const [textbooks, setTextbooks] = useState<any[]>([])
  const [wrongAnswers, setWrongAnswers] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [mode, setMode] = useState('fill')
  const [difficulty, setDifficulty] = useState('medium')
  const [count, setCount] = useState(10)
  const [phase, setPhase] = useState<Phase>('select')
  const [result, setResult] = useState<any>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [checked, setChecked] = useState(false)
  const [score, setScore] = useState(0)
  const [timer, setTimer] = useState(0)
  const [timerActive, setTimerActive] = useState(false)
  const [wrongOnly, setWrongOnly] = useState(false)
  const [tab, setTab] = useState<'textbook'|'wrong'>('textbook')

  useEffect(() => {
    const id = localStorage.getItem('selectedChildId') ?? ''
    setChildId(id)
    if (id) {
      supabase.from('textbooks').select('*').eq('child_id', id).eq('status', 'ready').then(({ data }) => setTextbooks(data ?? []))
      supabase.from('wrong_answers').select('*').eq('child_id', id).eq('mastered', false).order('created_at', { ascending: false }).then(({ data }) => setWrongAnswers(data ?? []))
    }
  }, [])

  useEffect(() => {
    let interval: any
    if (timerActive) interval = setInterval(() => setTimer(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [timerActive])

  async function startQuiz() {
    if (!selected?.content && !wrongOnly) return
    setPhase('loading'); setAnswers({}); setChecked(false); setTimer(0)

    let content = selected?.content ?? ''
    // If wrong only mode, build content from wrong answers
    if (wrongOnly && wrongAnswers.length > 0) {
      content = wrongAnswers.slice(0, 20).map(w => `問題：${w.question}\n答案：${w.correct_answer}`).join('\n\n')
    }

    const res = await fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, mode, difficulty, count, grade: selected?.grade ?? '國二', title: selected?.title ?? '錯題複習' }),
    })
    const data = await res.json()
    setResult(data)
    setPhase('result')
    if (mode === 'exam') setTimerActive(true)
  }

  async function checkAnswers() {
    const qs = result?.questions ?? []
    let correct = 0
    qs.forEach((q: any, i: number) => {
      const userAns = (answers[i] ?? '').trim()
      const correctAns = (mode === 'exam' ? q.answer : q.blanks?.[0]) ?? ''
      if (userAns === correctAns) correct++
      else {
        // Save to wrong answers
        supabase.from('wrong_answers').insert({
          child_id: childId, textbook_id: selected?.id,
          subject_name: selected?.subject_name,
          question: q.text, correct_answer: correctAns,
          student_answer: userAns,
        })
      }
    })
    const s = Math.round((correct / qs.length) * 100)
    setScore(s); setChecked(true); setTimerActive(false)
    supabase.from('study_sessions').insert({
      child_id: childId, textbook_id: selected?.id,
      subject_name: selected?.subject_name, activity_type: mode, score: s,
      total_questions: qs.length, correct_count: correct, duration_mins: Math.round(timer/60),
    })
    // Refresh wrong answers
    supabase.from('wrong_answers').select('*').eq('child_id', childId).eq('mastered', false).then(({ data }) => setWrongAnswers(data ?? []))
  }

  async function markMastered(id: string) {
    await supabase.from('wrong_answers').update({ mastered: true }).eq('id', id)
    setWrongAnswers(prev => prev.filter(w => w.id !== id))
  }

  function formatTime(s: number) { return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}` }

  function reset() { setPhase('select'); setResult(null); setChecked(false); setSelected(null); setWrongOnly(false) }

  // ── SELECT ──
  if (phase === 'select') return (
    <div className="p-4 space-y-3 animate-in">
      <div className="flex gap-2">
        <button onClick={() => setTab('textbook')} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'textbook' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>選課文複習</button>
        <button onClick={() => setTab('wrong')} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1 ${tab === 'wrong' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
          <AlertCircle size={14} /> 錯題重練 {wrongAnswers.length > 0 && <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{wrongAnswers.length}</span>}
        </button>
      </div>

      {tab === 'textbook' && (
        <>
          <h2 className="text-sm text-slate-400">選擇課文</h2>
          {textbooks.length === 0 ? (
            <div className="card p-8 text-center text-slate-500"><p className="text-3xl mb-2">📚</p><p>請先上傳課文</p></div>
          ) : (
            <div className="space-y-2">
              {textbooks.map(t => (
                <button key={t.id} onClick={() => { setSelected(t); setWrongOnly(false); setPhase('configure') }}
                  className="w-full card-hover p-4 flex items-center gap-3 text-left">
                  <span className="text-2xl">{getSubjectEmoji(t.subject_name)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{t.lesson_number}：{t.title}</p>
                    <p className="text-xs text-slate-500">{t.grade} · {t.semester}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-600" />
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'wrong' && (
        <>
          {wrongAnswers.length === 0 ? (
            <div className="card p-8 text-center text-slate-500"><p className="text-3xl mb-2">🎉</p><p>沒有錯題！繼續保持！</p></div>
          ) : (
            <>
              <button onClick={() => { setWrongOnly(true); setPhase('configure') }}
                className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2">
                <AlertCircle size={16} /> 開始錯題重練（{wrongAnswers.length} 題）
              </button>
              <div className="space-y-2">
                {wrongAnswers.map(w => (
                  <div key={w.id} className="card p-4">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{getSubjectEmoji(w.subject_name ?? '')}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-300 line-clamp-2">{w.question}</p>
                        <p className="text-xs text-emerald-400 mt-1">✓ {w.correct_answer}</p>
                      </div>
                      <button onClick={() => markMastered(w.id)} className="text-xs text-slate-500 hover:text-emerald-400 transition-colors flex-shrink-0 mt-1">✓ 已熟</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )

  // ── CONFIGURE ──
  if (phase === 'configure') return (
    <div className="p-4 space-y-4 animate-in">
      <button onClick={() => setPhase('select')} className="text-blue-400 text-sm">← 重新選擇</button>
      <div className="card p-3 flex items-center gap-3">
        <span className="text-2xl">{wrongOnly ? '❌' : getSubjectEmoji(selected?.subject_name ?? '')}</span>
        <div>
          <p className="font-medium text-white text-sm">{wrongOnly ? `錯題重練（${wrongAnswers.length} 題）` : selected?.title}</p>
          <p className="text-xs text-slate-500">{wrongOnly ? '自動出題' : `${selected?.subject_name} · ${selected?.grade}`}</p>
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold text-slate-400 mb-2">複習模式</h2>
        <div className="grid grid-cols-2 gap-2">
          {QUIZ_MODES.map(m => (
            <button key={m.value} onClick={() => setMode(m.value)}
              className={`p-3 rounded-xl border text-left transition-all ${mode === m.value ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}>
              <div className="text-xl mb-1">{m.emoji}</div>
              <div className="text-sm font-medium text-white">{m.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold text-slate-400 mb-2">難易度</h2>
        <div className="flex gap-2">
          {DIFFICULTY_LEVELS.map(d => (
            <button key={d.value} onClick={() => setDifficulty(d.value)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${difficulty === d.value ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold text-slate-400 mb-2">題數：{count} 題</h2>
        <input type="range" min={3} max={30} value={count} onChange={e => setCount(+e.target.value)} className="w-full accent-blue-500" />
      </div>
      <button onClick={startQuiz} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-semibold text-base">
        開始複習 🚀
      </button>
    </div>
  )

  // ── LOADING ──
  if (phase === 'loading') return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
      <Loader2 size={40} className="animate-spin text-blue-400" />
      <p className="text-sm">AI 正在生成題目…</p>
    </div>
  )

  // ── RESULT: SUMMARY ──
  if (phase === 'result' && mode === 'summary') return (
    <div className="p-4 space-y-3 animate-in">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-white">📋 重點整理</h1>
        <button onClick={reset} className="btn-ghost"><RotateCcw size={14}/> 重新</button>
      </div>
      {(result?.items ?? []).map((item: any, i: number) => (
        <div key={i} className="card p-4">
          <div className="flex items-start gap-2">
            <span className={`mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${item.importance === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>{i+1}</span>
            <div>
              <p className="font-semibold text-white text-sm mb-1">{item.point}</p>
              <p className="text-slate-400 text-sm leading-relaxed">{item.detail}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  // ── RESULT: FILL ──
  if (phase === 'result' && mode === 'fill') return (
    <div className="p-4 space-y-3 animate-in">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-white">✏️ 填空複習</h1>
        <div className="flex items-center gap-2">
          {checked && <span className={`text-sm font-bold ${score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{score}分</span>}
          <button onClick={reset} className="btn-ghost"><RotateCcw size={14}/></button>
        </div>
      </div>
      {(result?.questions ?? []).map((q: any, i: number) => {
        const isCorrect = checked && (answers[i] ?? '').trim() === q.blanks?.[0]
        const isWrong = checked && (answers[i] ?? '').trim() !== q.blanks?.[0]
        return (
          <div key={i} className={`card p-4 ${checked ? (isCorrect ? 'border-emerald-500/30' : 'border-red-500/30') : ''}`}>
            <p className="text-sm text-slate-300 mb-3 leading-relaxed">{q.text.replace('___', '▢▢▢')}</p>
            <input disabled={checked}
              className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm text-white focus:outline-none ${checked ? (isCorrect ? 'border-emerald-500' : 'border-red-500') : 'border-slate-700 focus:border-blue-500'}`}
              placeholder="填入答案…" value={answers[i] ?? ''} onChange={e => setAnswers(a => ({ ...a, [i]: e.target.value }))} />
            {checked && isWrong && <p className="text-xs text-emerald-400 mt-2">✓ 正確答案：{q.blanks?.[0]}</p>}
          </div>
        )
      })}
      {!checked ? (
        <button onClick={checkAnswers} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-semibold">批改答案</button>
      ) : (
        <button onClick={reset} className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl">再練一次</button>
      )}
    </div>
  )

  // ── RESULT: EXAM ──
  if (phase === 'result' && mode === 'exam') return (
    <div className="p-4 space-y-3 animate-in">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-white">📝 模擬考卷</h1>
        <div className="flex items-center gap-2">
          <span className="font-mono text-blue-400 text-sm bg-blue-500/10 px-3 py-1 rounded-full">⏱ {formatTime(timer)}</span>
          <button onClick={reset} className="btn-ghost"><RotateCcw size={14}/></button>
        </div>
      </div>
      {checked && (
        <div className={`card p-4 text-center border-2 ${score >= 80 ? 'border-emerald-500/40 bg-emerald-500/5' : score >= 60 ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-red-500/40 bg-red-500/5'}`}>
          <p className={`text-4xl font-bold mb-1 ${score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{score}分</p>
          <p className="text-slate-400 text-sm">{score >= 80 ? '太棒了！🎉' : score >= 60 ? '繼續加油！💪' : '需要多複習喔！📚'}</p>
        </div>
      )}
      {(result?.questions ?? []).map((q: any, i: number) => {
        const isCorrect = checked && answers[i] === q.answer
        const isWrong = checked && answers[i] !== q.answer
        return (
          <div key={i} className={`card p-4 ${checked ? (isCorrect ? 'border-emerald-500/20' : 'border-red-500/20') : ''}`}>
            <p className="text-sm font-medium text-white mb-3">{i+1}. {q.text}</p>
            {q.type === 'choice' && q.options ? (
              <div className="space-y-2">
                {q.options.map((opt: string, j: number) => {
                  const letter = ['A','B','C','D'][j]
                  const isAns = letter === q.answer; const isPicked = answers[i] === letter
                  return (
                    <button key={j} disabled={checked} onClick={() => setAnswers(a => ({ ...a, [i]: letter }))}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all border ${checked ? (isAns ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : isPicked ? 'border-red-500 bg-red-500/10 text-red-300' : 'border-slate-800 text-slate-500') : (isPicked ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-slate-800 text-slate-300 hover:border-slate-600')}`}>
                      {letter}. {opt}
                    </button>
                  )
                })}
              </div>
            ) : (
              <input disabled={checked}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="填入答案…" value={answers[i] ?? ''} onChange={e => setAnswers(a => ({ ...a, [i]: e.target.value }))} />
            )}
            {checked && isWrong && <p className="text-xs text-emerald-400 mt-2">✓ {q.answer} — {q.explanation}</p>}
          </div>
        )
      })}
      {!checked ? (
        <button onClick={checkAnswers} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-semibold">繳交考卷</button>
      ) : (
        <button onClick={reset} className="w-full bg-slate-700 text-white py-3 rounded-xl">重新出題</button>
      )}
    </div>
  )

  // ── RESULT: KNOWLEDGE ──
  if (phase === 'result' && mode === 'knowledge') return (
    <div className="p-4 space-y-3 animate-in">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-white">🔊 知識點攻略</h1>
        <button onClick={reset} className="btn-ghost"><RotateCcw size={14}/></button>
      </div>
      {(result?.units ?? []).map((unit: any, i: number) => (
        <div key={i} className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold">{i+1}</span>
            <h3 className="font-semibold text-white text-sm">{unit.title}</h3>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">{unit.explanation}</p>
          {unit.example && <div className="bg-slate-800/60 rounded-lg p-3 text-xs text-slate-400">💡 {unit.example}</div>}
          <div className="border-t border-slate-800 pt-3">
            <p className="text-xs text-slate-500 mb-2">練習題：</p>
            <p className="text-sm text-slate-300">{unit.question}</p>
            <details className="mt-2"><summary className="text-xs text-blue-400 cursor-pointer">查看答案</summary>
              <p className="text-sm text-emerald-400 mt-1">{unit.answer}</p>
            </details>
          </div>
        </div>
      ))}
    </div>
  )

  return null
}
