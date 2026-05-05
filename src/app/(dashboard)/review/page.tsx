'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { QUIZ_MODES, DIFFICULTY_LEVELS, getSubjectEmoji, getSubjectColor } from '@/lib/constants'
import { ChevronRight, Loader2, RotateCcw, AlertCircle, ArrowLeft, Check } from 'lucide-react'

type Phase = 'select-subject' | 'select-textbooks' | 'configure' | 'loading' | 'result'

export default function ReviewPage() {
  const [childId, setChildId] = useState('')
  const [textbooks, setTextbooks] = useState<any[]>([])
  const [wrongAnswers, setWrongAnswers] = useState<any[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState('fill')
  const [difficulty, setDifficulty] = useState('medium')
  const [count, setCount] = useState(10)
  const [phase, setPhase] = useState<Phase>('select-subject')
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

  // 計算每個科目的課文數量
  const subjectCounts: Record<string, number> = {}
  textbooks.forEach(t => {
    subjectCounts[t.subject_name] = (subjectCounts[t.subject_name] || 0) + 1
  })

  const SUBJECTS = ['國語', '英文', '數學', '理化', '社會']
  const subjectsWithData = SUBJECTS.filter(s => subjectCounts[s] > 0)

  const filteredTextbooks = textbooks.filter(t => t.subject_name === selectedSubject)
  const selectedTextbooks = textbooks.filter(t => selectedIds.has(t.id))

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }

  async function startQuiz() {
    if (selectedTextbooks.length === 0 && !wrongOnly) return
    setPhase('loading'); setAnswers({}); setChecked(false); setTimer(0)

    let content = ''
    let title = '複習'
    if (wrongOnly && wrongAnswers.length > 0) {
      content = wrongAnswers.slice(0, 20).map(w => `問題：${w.question}\n答案：${w.correct_answer}`).join('\n\n')
      title = '錯題重練'
    } else {
      content = selectedTextbooks.map(t => `【${t.lesson_number} ${t.title}】\n${t.content}`).join('\n\n---\n\n')
      title = selectedTextbooks.length === 1 ? selectedTextbooks[0].title : `${selectedSubject} 多課複習（${selectedTextbooks.length} 課）`
    }

    const grade = selectedTextbooks[0]?.grade ?? '國二'
    const res = await fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, mode, difficulty, count, grade, title }),
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
        const refTextbook = selectedTextbooks[0]
        supabase.from('wrong_answers').insert({
          child_id: childId, textbook_id: refTextbook?.id,
          subject_name: refTextbook?.subject_name,
          question: q.text, correct_answer: correctAns,
          student_answer: userAns,
        })
      }
    })
    const s = Math.round((correct / qs.length) * 100)
    setScore(s); setChecked(true); setTimerActive(false)
    const refTextbook = selectedTextbooks[0]
    supabase.from('study_sessions').insert({
      child_id: childId, textbook_id: refTextbook?.id,
      subject_name: refTextbook?.subject_name, activity_type: mode, score: s,
      total_questions: qs.length, correct_count: correct, duration_mins: Math.round(timer/60),
    })
    supabase.from('wrong_answers').select('*').eq('child_id', childId).eq('mastered', false).then(({ data }) => setWrongAnswers(data ?? []))
  }

  async function markMastered(id: string) {
    await supabase.from('wrong_answers').update({ mastered: true }).eq('id', id)
    setWrongAnswers(prev => prev.filter(w => w.id !== id))
  }

  function formatTime(s: number) { return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}` }

  function reset() {
    setPhase('select-subject'); setResult(null); setChecked(false)
    setSelectedIds(new Set()); setSelectedSubject(''); setWrongOnly(false)
  }

  // ============ 通用樣式 ============
  const containerStyle: React.CSSProperties = { padding: '16px', background: '#f8fafc', minHeight: '100%', overflowY: 'auto' }
  const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
  const titleStyle: React.CSSProperties = { fontSize: '15px', fontWeight: 700, color: '#1e293b', margin: 0 }
  const subTitleStyle: React.CSSProperties = { fontSize: '13px', color: '#64748b', margin: 0 }
  const backBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#1e293b', fontWeight: 600, cursor: 'pointer' }

  // ============ 步驟1：選科目 ============
  if (phase === 'select-subject') return (
    <div style={containerStyle}>
      {/* 上方 Tab */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button onClick={() => setTab('textbook')}
          style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer',
            background: tab === 'textbook' ? '#2563eb' : 'white', color: tab === 'textbook' ? 'white' : '#64748b',
            boxShadow: tab === 'textbook' ? '0 2px 6px rgba(37,99,235,0.3)' : '0 1px 3px rgba(0,0,0,0.05)' }}>
          📚 選課文複習
        </button>
        <button onClick={() => setTab('wrong')}
          style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer',
            background: tab === 'wrong' ? '#ef4444' : 'white', color: tab === 'wrong' ? 'white' : '#64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            boxShadow: tab === 'wrong' ? '0 2px 6px rgba(239,68,68,0.3)' : '0 1px 3px rgba(0,0,0,0.05)' }}>
          <AlertCircle size={14}/> 錯題重練 {wrongAnswers.length > 0 && <span style={{ background: 'rgba(255,255,255,0.3)', padding: '0 6px', borderRadius: '10px', fontSize: '11px' }}>{wrongAnswers.length}</span>}
        </button>
      </div>

      {tab === 'textbook' && (
        <>
          <p style={{ ...subTitleStyle, marginBottom: '12px', fontWeight: 600 }}>選擇科目</p>
          {subjectsWithData.length === 0 ? (
            <div style={{ ...cardStyle, padding: '32px', textAlign: 'center' }}>
              <p style={{ fontSize: '36px', margin: '0 0 8px' }}>📚</p>
              <p style={{ ...subTitleStyle }}>請先在「課本資料庫」上傳課文</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
              {subjectsWithData.map(s => {
                const color = getSubjectColor(s)
                return (
                  <button key={s} onClick={() => { setSelectedSubject(s); setSelectedIds(new Set()); setPhase('select-textbooks') }}
                    style={{ ...cardStyle, padding: '20px 16px', cursor: 'pointer', textAlign: 'center', borderTop: `3px solid ${color}`, transition: 'transform 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                    <div style={{ fontSize: '32px', marginBottom: '6px' }}>{getSubjectEmoji(s)}</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>{s}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{subjectCounts[s]} 課</div>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === 'wrong' && (
        <>
          {wrongAnswers.length === 0 ? (
            <div style={{ ...cardStyle, padding: '32px', textAlign: 'center' }}>
              <p style={{ fontSize: '36px', margin: '0 0 8px' }}>🎉</p>
              <p style={{ ...titleStyle }}>沒有錯題！繼續保持！</p>
            </div>
          ) : (
            <>
              <button onClick={() => { setWrongOnly(true); setPhase('configure') }}
                style={{ width: '100%', padding: '14px', borderRadius: '10px', background: '#ef4444', color: 'white', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
                <AlertCircle size={16}/> 開始錯題重練（{wrongAnswers.length} 題）
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {wrongAnswers.map(w => (
                  <div key={w.id} style={{ ...cardStyle, padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>{getSubjectEmoji(w.subject_name ?? '')}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', color: '#334155', margin: 0, lineHeight: 1.5 }}>{w.question}</p>
                        <p style={{ fontSize: '12px', color: '#10b981', margin: '4px 0 0', fontWeight: 600 }}>✓ {w.correct_answer}</p>
                      </div>
                      <button onClick={() => markMastered(w.id)} style={{ fontSize: '11px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', flexShrink: 0 }}>✓ 已熟</button>
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

  // ============ 步驟2：選課文（多選） ============
  if (phase === 'select-textbooks') {
    const subjectColor = getSubjectColor(selectedSubject)
    return (
      <div style={containerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button onClick={() => setPhase('select-subject')} style={backBtnStyle}>
            <ArrowLeft size={14}/> 返回
          </button>
          <div>
            <p style={{ ...titleStyle }}>{getSubjectEmoji(selectedSubject)} {selectedSubject}</p>
            <p style={{ ...subTitleStyle }}>勾選要複習的課文（可多選）</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '80px' }}>
          {filteredTextbooks.map(t => {
            const isSelected = selectedIds.has(t.id)
            return (
              <button key={t.id} onClick={() => toggleSelect(t.id)}
                style={{ ...cardStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left',
                  background: isSelected ? `${subjectColor}15` : 'white',
                  borderColor: isSelected ? subjectColor : '#e2e8f0',
                  borderWidth: isSelected ? '2px' : '1px',
                  padding: isSelected ? '11px 13px' : '12px 14px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${isSelected ? subjectColor : '#cbd5e1'}`, background: isSelected ? subjectColor : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isSelected && <Check size={14} color="white" strokeWidth={3}/>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.lesson_number}：{t.title}</p>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{t.grade} · {t.semester}{t.sub_subject ? ` · ${t.sub_subject}` : ''}</p>
                </div>
              </button>
            )
          })}
        </div>

        {selectedIds.size > 0 && (
          <div style={{ position: 'fixed', bottom: '70px', left: 0, right: 0, padding: '12px 16px', background: 'white', borderTop: '1px solid #e2e8f0', boxShadow: '0 -4px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10 }}>
            <p style={{ fontSize: '13px', color: '#1e293b', margin: 0, fontWeight: 600 }}>已選 {selectedIds.size} 課</p>
            <button onClick={() => setPhase('configure')}
              style={{ flex: 1, padding: '10px 16px', borderRadius: '10px', background: subjectColor, color: 'white', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
              下一步 →
            </button>
          </div>
        )}
      </div>
    )
  }

  // ============ 步驟3：設定 ============
  if (phase === 'configure') {
    const subjectColor = wrongOnly ? '#ef4444' : getSubjectColor(selectedSubject)
    return (
      <div style={containerStyle}>
        <button onClick={() => setPhase(wrongOnly ? 'select-subject' : 'select-textbooks')} style={{ ...backBtnStyle, marginBottom: '16px' }}>
          <ArrowLeft size={14}/> 返回
        </button>

        <div style={{ ...cardStyle, padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>{wrongOnly ? '❌' : getSubjectEmoji(selectedSubject)}</span>
          <div>
            <p style={{ ...titleStyle }}>{wrongOnly ? `錯題重練` : `${selectedSubject} 複習`}</p>
            <p style={{ ...subTitleStyle }}>{wrongOnly ? `${wrongAnswers.length} 題` : `已選 ${selectedTextbooks.length} 課`}</p>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <p style={{ ...subTitleStyle, fontWeight: 600, marginBottom: '8px' }}>複習模式</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {QUIZ_MODES.map(m => (
              <button key={m.value} onClick={() => setMode(m.value)}
                style={{ ...cardStyle, cursor: 'pointer', textAlign: 'left',
                  borderColor: mode === m.value ? subjectColor : '#e2e8f0',
                  borderWidth: mode === m.value ? '2px' : '1px',
                  padding: mode === m.value ? '11px' : '12px',
                  background: mode === m.value ? `${subjectColor}10` : 'white' }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{m.emoji}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{m.label}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <p style={{ ...subTitleStyle, fontWeight: 600, marginBottom: '8px' }}>難易度</p>
          <div style={{ display: 'flex', gap: '6px' }}>
            {DIFFICULTY_LEVELS.map(d => (
              <button key={d.value} onClick={() => setDifficulty(d.value)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  border: '1px solid',
                  borderColor: difficulty === d.value ? subjectColor : '#e2e8f0',
                  background: difficulty === d.value ? subjectColor : 'white',
                  color: difficulty === d.value ? 'white' : '#64748b' }}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <p style={{ ...subTitleStyle, fontWeight: 600, marginBottom: '8px' }}>題數：<span style={{ color: subjectColor, fontWeight: 700 }}>{count}</span> 題</p>
          <input type="range" min={3} max={30} value={count} onChange={e => setCount(+e.target.value)}
            style={{ width: '100%', accentColor: subjectColor }}/>
        </div>

        <button onClick={startQuiz}
          style={{ width: '100%', padding: '14px', borderRadius: '10px', background: subjectColor, color: 'white', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
          開始複習 🚀
        </button>
      </div>
    )
  }

  // ============ Loading ============
  if (phase === 'loading') return (
    <div style={{ ...containerStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
      <Loader2 size={36} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }}/>
      <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>AI 正在生成題目…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // ============ Result: SUMMARY ============
  if (phase === 'result' && mode === 'summary') return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <p style={{ ...titleStyle }}>📋 重點整理</p>
        <button onClick={reset} style={backBtnStyle}><RotateCcw size={14}/> 重新</button>
      </div>
      {(result?.items ?? []).map((item: any, i: number) => (
        <div key={i} style={{ ...cardStyle, padding: '14px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: item.importance === 'high' ? '#fee2e2' : '#dbeafe', color: item.importance === 'high' ? '#dc2626' : '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>{i+1}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>{item.point}</p>
              <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.6 }}>{item.detail}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  // ============ Result: FILL ============
  if (phase === 'result' && mode === 'fill') return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <p style={{ ...titleStyle }}>✏️ 填空複習</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {checked && <span style={{ fontSize: '15px', fontWeight: 700, color: score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444' }}>{score}分</span>}
          <button onClick={reset} style={backBtnStyle}><RotateCcw size={14}/></button>
        </div>
      </div>
      {(result?.questions ?? []).map((q: any, i: number) => {
        const userAns = (answers[i] ?? '').trim()
        const isCorrect = checked && userAns === q.blanks?.[0]
        const isWrong = checked && userAns !== q.blanks?.[0]
        return (
          <div key={i} style={{ ...cardStyle, borderColor: isCorrect ? '#10b981' : isWrong ? '#ef4444' : '#e2e8f0', borderWidth: checked ? '2px' : '1px', padding: checked ? '13px' : '14px' }}>
            <p style={{ fontSize: '14px', color: '#334155', margin: '0 0 10px', lineHeight: 1.6 }}>{q.text.replace('___', '▢▢▢')}</p>
            <input disabled={checked}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', color: '#1e293b', background: '#f8fafc', boxSizing: 'border-box' }}
              placeholder="填入答案…" value={answers[i] ?? ''} onChange={e => setAnswers(a => ({ ...a, [i]: e.target.value }))}/>
            {checked && isWrong && <p style={{ fontSize: '12px', color: '#10b981', marginTop: '6px', marginBottom: 0, fontWeight: 600 }}>✓ 正確答案：{q.blanks?.[0]}</p>}
          </div>
        )
      })}
      {!checked ? (
        <button onClick={checkAnswers} style={{ width: '100%', padding: '14px', borderRadius: '10px', background: '#2563eb', color: 'white', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer', marginTop: '8px' }}>批改答案</button>
      ) : (
        <button onClick={reset} style={{ width: '100%', padding: '14px', borderRadius: '10px', background: '#64748b', color: 'white', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer', marginTop: '8px' }}>再練一次</button>
      )}
    </div>
  )

  // ============ Result: EXAM ============
  if (phase === 'result' && mode === 'exam') return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <p style={{ ...titleStyle }}>📝 模擬考卷</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: 'monospace', color: '#2563eb', fontSize: '13px', background: '#dbeafe', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>⏱ {formatTime(timer)}</span>
          <button onClick={reset} style={backBtnStyle}><RotateCcw size={14}/></button>
        </div>
      </div>
      {checked && (
        <div style={{ ...cardStyle, padding: '16px', textAlign: 'center', marginBottom: '12px', borderWidth: '2px', borderColor: score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444', background: score >= 80 ? '#f0fdf4' : score >= 60 ? '#fffbeb' : '#fef2f2' }}>
          <p style={{ fontSize: '36px', fontWeight: 700, margin: '0 0 4px', color: score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444' }}>{score}分</p>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{score >= 80 ? '太棒了！🎉' : score >= 60 ? '繼續加油！💪' : '需要多複習喔！📚'}</p>
        </div>
      )}
      {(result?.questions ?? []).map((q: any, i: number) => {
        const isCorrect = checked && answers[i] === q.answer
        const isWrong = checked && answers[i] !== q.answer
        return (
          <div key={i} style={{ ...cardStyle, borderColor: isCorrect ? '#10b981' : isWrong ? '#ef4444' : '#e2e8f0', borderWidth: checked ? '2px' : '1px', padding: checked ? '13px' : '14px' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: '0 0 10px' }}>{i+1}. {q.text}</p>
            {q.type === 'choice' && q.options ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {q.options.map((opt: string, j: number) => {
                  const letter = ['A','B','C','D'][j]
                  const isAns = letter === q.answer
                  const isPicked = answers[i] === letter
                  return (
                    <button key={j} disabled={checked} onClick={() => setAnswers(a => ({ ...a, [i]: letter }))}
                      style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', cursor: checked ? 'default' : 'pointer', border: '1px solid',
                        borderColor: checked ? (isAns ? '#10b981' : isPicked ? '#ef4444' : '#e2e8f0') : (isPicked ? '#2563eb' : '#e2e8f0'),
                        background: checked ? (isAns ? '#f0fdf4' : isPicked ? '#fef2f2' : 'white') : (isPicked ? '#eff6ff' : 'white'),
                        color: checked ? (isAns ? '#10b981' : isPicked ? '#ef4444' : '#64748b') : (isPicked ? '#2563eb' : '#334155') }}>
                      {letter}. {opt}
                    </button>
                  )
                })}
              </div>
            ) : (
              <input disabled={checked}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', color: '#1e293b', background: '#f8fafc', boxSizing: 'border-box' }}
                placeholder="填入答案…" value={answers[i] ?? ''} onChange={e => setAnswers(a => ({ ...a, [i]: e.target.value }))}/>
            )}
            {checked && isWrong && <p style={{ fontSize: '12px', color: '#10b981', marginTop: '8px', marginBottom: 0, fontWeight: 600 }}>✓ {q.answer} — {q.explanation}</p>}
          </div>
        )
      })}
      {!checked ? (
        <button onClick={checkAnswers} style={{ width: '100%', padding: '14px', borderRadius: '10px', background: '#2563eb', color: 'white', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer', marginTop: '8px' }}>繳交考卷</button>
      ) : (
        <button onClick={reset} style={{ width: '100%', padding: '14px', borderRadius: '10px', background: '#64748b', color: 'white', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer', marginTop: '8px' }}>重新出題</button>
      )}
    </div>
  )

  // ============ Result: KNOWLEDGE ============
  if (phase === 'result' && mode === 'knowledge') return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <p style={{ ...titleStyle }}>🔊 知識點攻略</p>
        <button onClick={reset} style={backBtnStyle}><RotateCcw size={14}/> 重新</button>
      </div>
      {(result?.units ?? []).map((unit: any, i: number) => (
        <div key={i} style={{ ...cardStyle, padding: '14px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>{i+1}</span>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0 }}>{unit.title}</p>
          </div>
          <p style={{ fontSize: '13px', color: '#334155', margin: '0 0 8px', lineHeight: 1.6 }}>{unit.explanation}</p>
          {unit.example && <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', color: '#475569', marginBottom: '8px' }}>💡 {unit.example}</div>}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 4px' }}>練習題：</p>
            <p style={{ fontSize: '13px', color: '#334155', margin: '0 0 6px' }}>{unit.question}</p>
            <details><summary style={{ fontSize: '12px', color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}>查看答案</summary>
              <p style={{ fontSize: '13px', color: '#10b981', margin: '4px 0 0', fontWeight: 600 }}>{unit.answer}</p>
            </details>
          </div>
        </div>
      ))}
    </div>
  )

  return null
}
