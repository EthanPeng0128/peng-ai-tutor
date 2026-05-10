'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { QUIZ_MODES, DIFFICULTY_LEVELS, getSubjectEmoji, getSubjectColor } from '@/lib/constants'
import { ChevronRight, Loader2, RotateCcw, AlertCircle, ArrowLeft, Check, Sparkles, Save, ChevronDown } from 'lucide-react'
import html2canvas from 'html2canvas'

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
  const [weakFocus, setWeakFocus] = useState(true)
  const [phase, setPhase] = useState<Phase>('select-subject')
  const [result, setResult] = useState<any>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [checked, setChecked] = useState(false)
  const [score, setScore] = useState(0)
  const [timer, setTimer] = useState(0)
  const [timerActive, setTimerActive] = useState(false)
  const [wrongOnly, setWrongOnly] = useState(false)
  const [tab, setTab] = useState<'textbook'|'wrong'|'library'|'quizlib'>('textbook')
  const [multiLoading, setMultiLoading] = useState(false)
  const [multiSummaryHtml, setMultiSummaryHtml] = useState('')
  const [multiSubjectName, setMultiSubjectName] = useState('')
  const [multiCacheKey, setMultiCacheKey] = useState('')
  const [multiTitle, setMultiTitle] = useState('')
  const [multiSaved, setMultiSaved] = useState(false)
  const [multiSaving, setMultiSaving] = useState(false)
  const [wrongSavedMsg, setWrongSavedMsg] = useState('')
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())
  const [expandedTextbooks, setExpandedTextbooks] = useState<Set<string>>(new Set())
  const [savedSession, setSavedSession] = useState(false)
  const [summaryLibrary, setSummaryLibrary] = useState<any[]>([])
  const [editingSummary, setEditingSummary] = useState<any>(null)
  const [editTitle, setEditTitle] = useState('')
  const [viewingSummary, setViewingSummary] = useState<any>(null)
  const [quizSets, setQuizSets] = useState<any[]>([])
  const [currentQuizSetId, setCurrentQuizSetId] = useState<string|null>(null)
  const [examSummary, setExamSummary] = useState<any>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    const id = localStorage.getItem('selectedChildId') ?? ''
    setChildId(id)
    if (id) {
      supabase.from('textbooks').select('*').eq('child_id', id).eq('status', 'ready').then(({ data }) => setTextbooks(data ?? []))
      supabase.from('wrong_answers').select('*').eq('child_id', id).eq('mastered', false).order('created_at', { ascending: false }).then(({ data }) => setWrongAnswers(data ?? []))
      supabase.from('summary_sheets').select('*').eq('child_id', id).order('created_at', { ascending: false }).then(({ data }) => setSummaryLibrary(data ?? []))
      supabase.from('quiz_sets').select('*, quiz_attempts(score, total, correct_rate, created_at)').eq('child_id', id).order('created_at', { ascending: false }).then(({ data }) => setQuizSets(data ?? []))
    }
  }, [])

  useEffect(() => {
    let interval: any
    if (timerActive) interval = setInterval(() => setTimer(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [timerActive])

  const subjectCounts: Record<string, number> = {}
  textbooks.forEach(t => {
    subjectCounts[t.subject_name] = (subjectCounts[t.subject_name] || 0) + 1
  })

  const SUBJECTS = ['國語', '英文', '數學', '理化', '社會']
  const subjectsWithData = SUBJECTS.filter(s => subjectCounts[s] > 0)
  const filteredTextbooks = textbooks.filter(t => t.subject_name === selectedSubject)
  const selectedTextbooks = textbooks.filter(t => selectedIds.has(t.id))

  // 把錯題按科目+章節分類
  const wrongBySubject: Record<string, Record<string, any[]>> = {}
  wrongAnswers.forEach(w => {
    const subj = w.subject_name ?? '其他'
    const tbId = w.textbook_id ?? 'unknown'
    if (!wrongBySubject[subj]) wrongBySubject[subj] = {}
    if (!wrongBySubject[subj][tbId]) wrongBySubject[subj][tbId] = []
    wrongBySubject[subj][tbId].push(w)
  })

  function getTextbookInfo(id: string) {
    return textbooks.find(t => t.id === id)
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }

  function toggleSubjectExpand(subj: string) {
    setExpandedSubjects(prev => {
      const newSet = new Set(prev)
      if (newSet.has(subj)) newSet.delete(subj)
      else newSet.add(subj)
      return newSet
    })
  }

  function toggleTextbookExpand(id: string) {
    setExpandedTextbooks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }

  async function generateMultiSummary(regenerate = false) {
    if (selectedIds.size === 0) return
    setMultiLoading(true)
    setMultiSaved(false)
    try {
      const res = await fetch('/api/multi-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textbookIds: Array.from(selectedIds), regenerate, saveToLibrary: false }),
      })
      const data = await res.json()
      if (data.html) {
        setMultiSummaryHtml(data.html)
        setMultiTitle(data.title || '大範圍整理')
        setMultiSubjectName(data.subjectName || '')
        setMultiCacheKey([...selectedIds].sort().join(','))
      } else {
        alert('生成失敗：\n' + JSON.stringify(data, null, 2))
      }
    } catch (e: any) {
      alert('連線失敗：' + e.message)
    }
    setMultiLoading(false)
  }

  async function saveMultiToLibrary() {
    if (!multiSummaryHtml || !multiTitle.trim()) return
    setMultiSaving(true)
    try {
      const res = await fetch('/api/save-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          htmlContent: multiSummaryHtml,
          title: multiTitle.trim(),
          isMulti: true,
          textbookCount: selectedIds.size,
          subjectName: multiSubjectName,
        }),
      })
      const data = await res.json()
      if (data.saved) {
        setMultiSaved(true)
        const { data: libData } = await supabase.from('summary_sheets').select('*').eq('child_id', childId).order('created_at', { ascending: false })
        setSummaryLibrary(libData ?? [])
      } else {
        alert('儲存失敗：' + JSON.stringify(data))
      }
    } catch (e: any) {
      alert('儲存失敗：' + e.message)
    }
    setMultiSaving(false)
  }

  async function downloadAsImage(elementId: string, filename: string) {
    const el = document.getElementById(elementId)
    if (!el) { alert('找不到圖片元素'); return }
    try {
      const canvas = await html2canvas(el, { backgroundColor: 'white', scale: 2, useCORS: true })
      const link = document.createElement('a')
      link.download = `${filename}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e: any) {
      alert('下載失敗：' + e.message)
    }
  }

  function printElement(elementId: string) {
    const el = document.getElementById(elementId)
    if (!el) { alert('找不到圖片元素'); return }
    const printWindow = window.open('', '_blank', 'width=1300,height=900')
    if (!printWindow) { alert('請允許彈出視窗以列印'); return }
    
    printWindow.document.write(`
      <html><head><title>列印重點圖</title>
      <style>
        @page { 
          size: A4 landscape; 
          margin: 0; 
        }
        * { 
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        html, body { 
          width: 100%;
          background: #f1f5f9;
        }
        .toolbar {
          position: sticky;
          top: 0;
          background: #1e293b;
          color: white;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          z-index: 100;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .toolbar h2 {
          font-size: 16px;
          margin: 0;
          flex: 1;
        }
        .toolbar button {
          padding: 10px 20px;
          background: #a78bfa;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
        }
        .toolbar button:hover { background: #8b6bf3; }
        .scale-container {
          width: 1240px;
          height: 877px;
          transform-origin: top left;
          transform: scale(0.88);
          margin: 20px auto;
          background: white;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        @media print { 
          html, body {
            background: white !important;
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
          }
          .toolbar { display: none !important; }
          .scale-container {
            position: absolute;
            top: 0;
            left: 0;
            margin: 0 !important;
            box-shadow: none !important;
          }
          @page { size: A4 landscape; margin: 0; }
        }
      </style>
      </head><body>
        <div class="toolbar">
          <h2>📄 列印預覽</h2>
          <button onclick="window.print()">🖨 開始列印</button>
          <button onclick="window.close()" style="background:#64748b">✕ 關閉</button>
        </div>
        <div class="scale-container">${el.outerHTML}</div>
      </body></html>
    `)
    printWindow.document.close()
  }

  function tryCloseMultiPreview() {
    if (multiSummaryHtml && !multiSaved) {
      if (!confirm('⚠️ 這張重點圖還沒存到圖庫哦！\n\n關閉後就找不回來了，確定要離開嗎？')) {
        return
      }
    }
    setMultiSummaryHtml('')
    setMultiSaved(false)
    setMultiTitle('')
  }

  async function startQuiz() {
    if (selectedTextbooks.length === 0 && !wrongOnly) return
    setPhase('loading'); setAnswers({}); setChecked(false); setTimer(0); setSavedSession(false)
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
      body: JSON.stringify({ 
        content, mode, difficulty, count, grade, title,
        textbooks: selectedTextbooks.map(t => {
          const wrongCount = wrongAnswers.filter(w => w.textbook_id === t.id).length
          return {
            id: t.id,
            subject: t.subject_name,
            lesson_number: t.lesson_number,
            title: t.title,
            wrongCount,  // 這課答錯過幾題
          }
        }),
        weakFocus,
        weakTopics: weakFocus ? wrongAnswers
          .filter(w => selectedTextbooks.some(t => t.id === w.textbook_id))
          .slice(0, 8)
          .map(w => ({ question: w.question?.slice(0, 80), correct_answer: w.correct_answer })) : [],
      }),
    })
    const data = await res.json()
    setResult(data)
    setPhase('result')
    if (mode === 'exam') setTimerActive(true)
    
    // 自動存入題庫
    if (data && (data.questions || data.items)) {
      try {
        const saveRes = await fetch('/api/save-quiz-set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            childId,
            title: `${selectedSubject} ${selectedTextbooks.length === 1 ? selectedTextbooks[0].title : `${selectedTextbooks.length} 課`} ${mode === 'fill' ? '填空' : mode === 'exam' ? '模擬考' : '題目'}`,
            subjectName: selectedSubject,
            textbookCount: selectedTextbooks.length,
            mode,
            difficulty,
            questions: data.questions || data.items || [],
          }),
        })
        const saveData = await saveRes.json()
        if (saveData.saved && saveData.id) {
          setCurrentQuizSetId(saveData.id)
        }
      } catch (e) {
        console.error('儲存題庫失敗', e)
      }
    }
  }

  async function checkAnswers() {
    const qs = result?.questions ?? []
    let correct = 0
    const wrongQuestions: any[] = []
    qs.forEach((q: any, i: number) => {
      const userAns = (answers[i] ?? '').trim()
      const correctAns = (mode === 'exam' ? q.answer : q.blanks?.[0]) ?? ''
      if (userAns === correctAns) correct++
      else {
        wrongQuestions.push({
          index: i,
          text: q.text,
          userAnswer: userAns,
          correctAnswer: correctAns,
          lesson: q.lesson,
          explanation: q.explanation,
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
    
    // 記錄重考成績到題庫
    if (currentQuizSetId) {
      try {
        await fetch('/api/save-attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quizSetId: currentQuizSetId,
            childId,
            score: correct,
            total: qs.length,
            answers,
            durationSec: timer,
          }),
        })
        const { data: qsData } = await supabase.from('quiz_sets').select('*, quiz_attempts(score, total, correct_rate, created_at)').eq('child_id', childId).order('created_at', { ascending: false })
        setQuizSets(qsData ?? [])
      } catch (e) {
        console.error('儲存成績失敗', e)
      }
    }
    
    // 自動產生 AI 觀念分析（如果有錯題）
    console.log('[exam-summary] 錯題:', wrongQuestions.length, 'selectedTextbooks:', selectedTextbooks.length)
    if (wrongQuestions.length > 0) {
      setSummaryLoading(true)
      try {
        const fullTextbooks = textbooks.filter(t => selectedIds.has(t.id))
        const courseContent = fullTextbooks.map(t => `=== ${t.subject_name} ${t.lesson_number}：${t.title} ===
${t.content || ''}`).join('

').slice(0, 6000)
        console.log('[exam-summary] content 長度:', courseContent.length)
        const sumRes = await fetch('/api/exam-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wrongQuestions,
            content: courseContent,
            grade: fullTextbooks[0]?.grade || '國二',
            childId,
          }),
        })
        const sumData = await sumRes.json()
        console.log('[exam-summary] 回應:', sumData)
        if (sumData.summary) {
          setExamSummary(sumData.summary)
        } else if (sumData.error) {
          alert('AI 分析失敗：' + sumData.error + (sumData.detail ? '
' + sumData.detail : ''))
        }
      } catch (e: any) {
        console.error('觀念總結失敗', e)
        alert('AI 分析失敗：' + e.message)
      }
      setSummaryLoading(false)
    } else {
      setExamSummary(null)
    }
  }

  async function saveWrongAnswers() {
    const qs = result?.questions ?? []
    const wrongList: any[] = []
    qs.forEach((q: any, i: number) => {
      const userAns = (answers[i] ?? '').trim()
      const correctAns = (mode === 'exam' ? q.answer : q.blanks?.[0]) ?? ''
      if (userAns !== correctAns) {
        const refTextbook = selectedTextbooks[0]
        wrongList.push({
          child_id: childId,
          textbook_id: refTextbook?.id,
          subject_name: refTextbook?.subject_name,
          question: q.text,
          correct_answer: correctAns,
          student_answer: userAns,
        })
      }
    })
    if (wrongList.length === 0) {
      setWrongSavedMsg('🎉 全對！沒有錯題需要儲存')
      setTimeout(() => setWrongSavedMsg(''), 3000)
      return
    }
    const { error } = await supabase.from('wrong_answers').insert(wrongList)
    if (error) {
      alert('儲存失敗：' + error.message)
      return
    }
    setWrongSavedMsg(`✅ 已儲存 ${wrongList.length} 題錯題到錯題本`)
    setSavedSession(true)
    setTimeout(() => setWrongSavedMsg(''), 3000)
    supabase.from('wrong_answers').select('*').eq('child_id', childId).eq('mastered', false).then(({ data }) => setWrongAnswers(data ?? []))
  }

  async function markMastered(id: string) {
    await supabase.from('wrong_answers').update({ mastered: true }).eq('id', id)
    setWrongAnswers(prev => prev.filter(w => w.id !== id))
  }

  async function reloadLibrary() {
    const { data } = await supabase.from('summary_sheets').select('*').eq('child_id', childId).order('created_at', { ascending: false })
    setSummaryLibrary(data ?? [])
  }

  function openEditTitle(item: any) {
    setEditingSummary(item)
    setEditTitle(item.title || '未命名整理圖')
  }

  async function saveTitle() {
    if (!editingSummary || !editTitle.trim()) return
    await supabase.from('summary_sheets').update({ title: editTitle.trim() }).eq('id', editingSummary.id)
    setEditingSummary(null)
    reloadLibrary()
  }

  async function deleteSummary(id: string) {
    if (!confirm('確定要刪除這份重點整理圖嗎？\n刪除後無法復原。')) return
    await supabase.from('summary_sheets').delete().eq('id', id)
    reloadLibrary()
  }

  function formatTime(s: number) { return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}` }

  function reset() {
    setPhase('select-subject'); setResult(null); setChecked(false)
    setSelectedIds(new Set()); setSelectedSubject(''); setWrongOnly(false); setSavedSession(false)
  }

  const containerStyle: React.CSSProperties = { padding: '16px', background: '#f8fafc', minHeight: '100%', overflowY: 'auto' }
  const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
  const titleStyle: React.CSSProperties = { fontSize: '15px', fontWeight: 700, color: '#1e293b', margin: 0 }
  const subTitleStyle: React.CSSProperties = { fontSize: '13px', color: '#64748b', margin: 0 }
  const backBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#1e293b', fontWeight: 600, cursor: 'pointer' }

  if (phase === 'select-subject') return (
    <>
    <div style={containerStyle}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button onClick={() => setTab('textbook')}
          style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', background: tab === 'textbook' ? '#2563eb' : 'white', color: tab === 'textbook' ? 'white' : '#64748b', boxShadow: tab === 'textbook' ? '0 2px 6px rgba(37,99,235,0.3)' : '0 1px 3px rgba(0,0,0,0.05)' }}>
          📚 選課文複習
        </button>
        <button onClick={() => setTab('wrong')}
          style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', background: tab === 'wrong' ? '#ef4444' : 'white', color: tab === 'wrong' ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: tab === 'wrong' ? '0 2px 6px rgba(239,68,68,0.3)' : '0 1px 3px rgba(0,0,0,0.05)' }}>
          <AlertCircle size={14}/> 錯題重練 {wrongAnswers.length > 0 && <span style={{ background: 'rgba(255,255,255,0.3)', padding: '0 6px', borderRadius: '10px', fontSize: '11px' }}>{wrongAnswers.length}</span>}
        </button>
        <button onClick={() => setTab('library')}
          style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', background: tab === 'library' ? '#a78bfa' : 'white', color: tab === 'library' ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: tab === 'library' ? '0 2px 6px rgba(167,139,250,0.3)' : '0 1px 3px rgba(0,0,0,0.05)' }}>
          📊 圖庫 {summaryLibrary.length > 0 && <span style={{ background: 'rgba(255,255,255,0.3)', padding: '0 6px', borderRadius: '10px', fontSize: '11px' }}>{summaryLibrary.length}</span>}
        </button>
        <button onClick={() => setTab('quizlib')}
          style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', background: tab === 'quizlib' ? '#10b981' : 'white', color: tab === 'quizlib' ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: tab === 'quizlib' ? '0 2px 6px rgba(16,185,129,0.3)' : '0 1px 3px rgba(0,0,0,0.05)' }}>
          📝 題庫 {quizSets.length > 0 && <span style={{ background: 'rgba(255,255,255,0.3)', padding: '0 6px', borderRadius: '10px', fontSize: '11px' }}>{quizSets.length}</span>}
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
                    style={{ ...cardStyle, padding: '20px 16px', cursor: 'pointer', textAlign: 'center', borderTop: `3px solid ${color}` }}>
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

      {tab === 'quizlib' && (
        <>
          <p style={{ ...subTitleStyle, marginBottom: '12px', fontWeight: 600 }}>📝 我的題庫（{quizSets.length} 套）</p>
          {quizSets.length === 0 ? (
            <div style={{ ...cardStyle, padding: '32px', textAlign: 'center' }}>
              <p style={{ fontSize: '36px', margin: '0 0 8px' }}>📝</p>
              <p style={{ ...titleStyle }}>還沒有題庫</p>
              <p style={{ ...subTitleStyle, marginTop: '6px' }}>出題後會自動存到這裡，可以重複練習不花錢！</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {quizSets.map(qs => {
                const attempts = qs.quiz_attempts || []
                const attemptCount = attempts.length
                const avgRate = attemptCount > 0 ? attempts.reduce((sum: number, a: any) => sum + Number(a.correct_rate || 0), 0) / attemptCount : 0
                const lastAttempt = attempts[0]
                return (
                  <div key={qs.id} style={{ ...cardStyle, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          📋 {qs.title}
                        </p>
                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '3px 0 0' }}>
                          {qs.total_count} 題 · {qs.mode === 'fill' ? '填空' : qs.mode === 'exam' ? '模擬考' : qs.mode} · {new Date(qs.created_at).toLocaleDateString('zh-TW',{month:'numeric',day:'numeric'})}
                        </p>
                      </div>
                      <button onClick={async () => {
                          if (!confirm('確定刪除這套題目嗎？歷次成績紀錄也會一併刪除！')) return
                          await supabase.from('quiz_sets').delete().eq('id', qs.id)
                          const { data } = await supabase.from('quiz_sets').select('*, quiz_attempts(score, total, correct_rate, created_at)').eq('child_id', childId).order('created_at', { ascending: false })
                          setQuizSets(data ?? [])
                        }}
                        style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #fee2e2', background: '#fff5f5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: '14px' }}>
                        🗑
                      </button>
                    </div>
                    {attemptCount > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: '#f0fdf4', borderRadius: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>📊 重考 {attemptCount} 次</span>
                        <span style={{ fontSize: '11px', color: '#166534' }}>·</span>
                        <span style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>平均 {avgRate.toFixed(0)}%</span>
                        {lastAttempt && (
                          <>
                            <span style={{ fontSize: '11px', color: '#166534' }}>·</span>
                            <span style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>最近 {Number(lastAttempt.correct_rate).toFixed(0)}%</span>
                          </>
                        )}
                      </div>
                    )}
                    <button onClick={() => {
                        setResult({ questions: qs.questions })
                        setMode(qs.mode || 'exam')
                        setDifficulty(qs.difficulty || 'medium')
                        setCount(qs.total_count)
                        setSelectedSubject(qs.subject_name || '')
                        setCurrentQuizSetId(qs.id)
                        setAnswers({})
                        setChecked(false)
                        setScore(0)
                        setTimer(0)
                        setSavedSession(false)
                        setPhase('result')
                        if (qs.mode === 'exam') setTimerActive(true)
                      }}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                      ▶ 重新練習（不花錢！）
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === 'library' && (
        <>
          <p style={{ ...subTitleStyle, marginBottom: '12px', fontWeight: 600 }}>📊 我的重點圖庫（{summaryLibrary.length} 張）</p>
          {summaryLibrary.length === 0 ? (
            <div style={{ ...cardStyle, padding: '32px', textAlign: 'center' }}>
              <p style={{ fontSize: '36px', margin: '0 0 8px' }}>📊</p>
              <p style={{ ...titleStyle }}>還沒有重點圖</p>
              <p style={{ ...subTitleStyle, marginTop: '6px' }}>選課文後生成「大範圍整理」就會自動存到這裡</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {summaryLibrary.map(s => (
                <div key={s.id} style={{ ...cardStyle, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div onClick={() => setViewingSummary(s)} style={{ cursor: 'pointer', flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.is_multi ? '📊' : '📋'} {s.title || '未命名整理圖'}
                    </p>
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: '3px 0 0' }}>
                      {s.subject_name && `${s.subject_name} · `}
                      {s.is_multi ? `${s.textbook_count || 0} 課` : '單課'} · 
                      {' '}{new Date(s.created_at).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}
                    </p>
                  </div>
                  <button onClick={() => openEditTitle(s)} style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #e0f2fe', background: '#f0f9ff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ✏️
                  </button>
                  <button onClick={() => deleteSummary(s.id)} style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #fee2e2', background: '#fff5f5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: '14px' }}>
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'wrong' && (
        <>
          <p style={{ ...subTitleStyle, marginBottom: '12px', fontWeight: 600 }}>錯題分類（按科目 / 章節）</p>
          {wrongAnswers.length === 0 ? (
            <div style={{ ...cardStyle, padding: '32px', textAlign: 'center' }}>
              <p style={{ fontSize: '36px', margin: '0 0 8px' }}>🎉</p>
              <p style={{ ...titleStyle }}>沒有錯題！繼續保持！</p>
            </div>
          ) : (
            <>
              <button onClick={() => { setWrongOnly(true); setPhase('configure') }}
                style={{ width: '100%', padding: '14px', borderRadius: '10px', background: '#ef4444', color: 'white', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
                <AlertCircle size={16}/> 全部錯題重練（{wrongAnswers.length} 題）
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.keys(wrongBySubject).map(subj => {
                  const tbs = wrongBySubject[subj]
                  const totalCount = Object.values(tbs).reduce((sum, arr) => sum + arr.length, 0)
                  const subjColor = getSubjectColor(subj)
                  const isExpanded = expandedSubjects.has(subj)
                  return (
                    <div key={subj} style={{ ...cardStyle, overflow: 'hidden' }}>
                      <button onClick={() => toggleSubjectExpand(subj)}
                        style={{ width: '100%', padding: '12px 14px', background: 'white', border: 'none', borderLeft: `4px solid ${subjColor}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>{getSubjectEmoji(subj)}</span>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0 }}>{subj}</p>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>{totalCount} 題錯題 · {Object.keys(tbs).length} 個章節</p>
                        </div>
                        <ChevronDown size={18} color="#64748b" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}/>
                      </button>

                      {isExpanded && (
                        <div style={{ borderTop: '1px solid #e2e8f0' }}>
                          {Object.entries(tbs).map(([tbId, errs]) => {
                            const tb = getTextbookInfo(tbId)
                            const tbExpanded = expandedTextbooks.has(tbId)
                            return (
                              <div key={tbId}>
                                <button onClick={() => toggleTextbookExpand(tbId)}
                                  style={{ width: '100%', padding: '10px 14px 10px 30px', background: '#f8fafc', border: 'none', borderTop: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <ChevronRight size={14} color="#64748b" style={{ transform: tbExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}/>
                                  <div style={{ flex: 1, textAlign: 'left' }}>
                                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#334155', margin: 0 }}>
                                      {tb ? `${tb.lesson_number} ${tb.title}` : '未知章節'}
                                    </p>
                                  </div>
                                  <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>{errs.length}題</span>
                                </button>

                                {tbExpanded && errs.map(w => (
                                  <div key={w.id} style={{ padding: '10px 14px 10px 50px', background: 'white', borderTop: '1px solid #f1f5f9' }}>
                                    <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.5 }}>{w.question}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '4px' }}>
                                      <p style={{ fontSize: '12px', color: '#10b981', margin: 0, fontWeight: 600 }}>✓ {w.correct_answer}</p>
                                      <button onClick={() => markMastered(w.id)} style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>標記已熟</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
    {editingSummary && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }} onClick={() => setEditingSummary(null)}>
        <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto', background: 'white', borderRadius: '24px 24px 0 0', padding: '24px' }} onClick={e => e.stopPropagation()}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>✏️ 編輯重點圖名稱</h3>
          <input value={editTitle} onChange={e => setEditTitle(e.target.value)} autoFocus
            style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '15px', color: '#1e293b', boxSizing: 'border-box', marginBottom: '16px' }}
            placeholder="輸入新名稱..."/>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setEditingSummary(null)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}>取消</button>
            <button onClick={saveTitle} disabled={!editTitle.trim()} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: editTitle.trim() ? '#a78bfa' : '#cbd5e1', color: 'white', fontSize: '14px', cursor: editTitle.trim() ? 'pointer' : 'not-allowed', fontWeight: 600 }}>儲存</button>
          </div>
        </div>
      </div>
    )}
    {viewingSummary && (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#000', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '20px' }}>
        <div style={{ position: 'fixed', top: '12px', left: '12px', right: '12px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10000 }}>
          <div style={{ flex: 1, padding: '8px 14px', borderRadius: '20px', background: 'rgba(255,255,255,0.95)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', fontSize: '13px', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
            {viewingSummary.title || '未命名'}
          </div>
          <button onClick={() => downloadAsImage('library-view-img', viewingSummary.title || '重點圖')} style={{ flexShrink: 0, height: '36px', padding: '0 12px', borderRadius: '18px', border: 'none', background: 'rgba(255,255,255,0.95)', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>💾</button>
          <button onClick={() => printElement('library-view-img')} style={{ flexShrink: 0, height: '36px', padding: '0 12px', borderRadius: '18px', border: 'none', background: 'rgba(255,255,255,0.95)', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>🖨</button>
          <button onClick={() => setViewingSummary(null)} style={{ flexShrink: 0, width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.95)', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', fontSize: '18px', fontWeight: 700 }}>✕</button>
        </div>
        <div style={{ width: '100vw', height: '100vh', overflow: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pinch-zoom auto', padding: '60px 12px 20px' }}>
          <div id="library-view-img" style={{ width: '1240px', height: '877px', background: 'white', borderRadius: '8px', overflow: 'hidden', margin: '0 auto', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: viewingSummary.html_content }}/>
        </div>
      </div>
    )}
    </>
  )

  if (phase === 'select-textbooks') {
    const subjectColor = getSubjectColor(selectedSubject)
    return (
      <>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '120px' }}>
          {filteredTextbooks.map(t => {
            const isSelected = selectedIds.has(t.id)
            return (
              <button key={t.id} onClick={() => toggleSelect(t.id)}
                style={{ ...cardStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', background: isSelected ? `${subjectColor}15` : 'white', borderColor: isSelected ? subjectColor : '#e2e8f0', borderWidth: isSelected ? '2px' : '1px', padding: isSelected ? '11px 13px' : '12px 14px' }}>
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
          <div style={{ position: 'fixed', bottom: '70px', left: 0, right: 0, padding: '12px 16px', background: 'white', borderTop: '1px solid #e2e8f0', boxShadow: '0 -4px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 10 }}>
            <p style={{ fontSize: '13px', color: '#1e293b', margin: 0, fontWeight: 600, textAlign: 'center' }}>已選 {selectedIds.size} 課</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => generateMultiSummary(false)} disabled={multiLoading}
                style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', background: 'white', color: '#1e293b', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '13px', cursor: multiLoading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', opacity: multiLoading ? 0.6 : 1 }}>
                {multiLoading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }}/> 生成中…</> : <><Sparkles size={14}/> 大範圍整理</>}
              </button>
              <button onClick={() => setPhase('configure')}
                style={{ flex: 1, padding: '10px 16px', borderRadius: '10px', background: subjectColor, color: 'white', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                出題複習 →
              </button>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}
      </div>

      {multiSummaryHtml && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#000', zIndex: 9999, overflow: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pinch-zoom auto', padding: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
          <button onClick={tryCloseMultiPreview}
            style={{ position: 'fixed', top: '12px', right: '12px', width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.95)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, boxShadow: '0 2px 8px rgba(0,0,0,0.3)', fontSize: '20px', fontWeight: 700 }}>✕</button>
          <button onClick={() => generateMultiSummary(true)} disabled={multiLoading}
            style={{ position: 'fixed', top: '12px', left: '12px', padding: '10px 16px', borderRadius: '22px', border: 'none', background: 'rgba(255,255,255,0.95)', cursor: 'pointer', zIndex: 10000, boxShadow: '0 2px 8px rgba(0,0,0,0.3)', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <RotateCcw size={14}/> 重新生成
          </button>
          <div style={{ width: '95vw', maxWidth: '1240px' }}>
            <div id="multi-preview-img" style={{ width: '1240px', height: '877px', background: 'white', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: multiSummaryHtml }}/>
          </div>
          <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.98)', borderRadius: '16px', padding: '14px 18px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', zIndex: 10001, display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '320px', maxWidth: '90vw' }}>
            <input value={multiTitle} onChange={e => setMultiTitle(e.target.value)} placeholder="輸入標題..."
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', color: '#1e293b' }} disabled={multiSaved}/>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => generateMultiSummary(true)} disabled={multiLoading || multiSaving}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: 'white', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                🔄 重新生成
              </button>
              <button onClick={() => downloadAsImage('multi-preview-img', multiTitle || '大範圍整理')}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: 'white', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                💾 下載
              </button>
              <button onClick={() => printElement('multi-preview-img')}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: 'white', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                🖨 列印
              </button>
              <button onClick={saveMultiToLibrary} disabled={multiSaving || multiSaved || !multiTitle.trim()}
                style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', background: multiSaved ? '#10b981' : (multiSaving ? '#94a3b8' : '#a78bfa'), color: 'white', fontSize: '14px', fontWeight: 700, cursor: multiSaved ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                {multiSaving ? '⏳ 儲存中...' : multiSaved ? '✅ 已存入圖庫' : '💾 存入圖庫'}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
    )
  }

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
                style={{ ...cardStyle, cursor: 'pointer', textAlign: 'left', borderColor: mode === m.value ? subjectColor : '#e2e8f0', borderWidth: mode === m.value ? '2px' : '1px', padding: mode === m.value ? '11px' : '12px', background: mode === m.value ? `${subjectColor}10` : 'white' }}>
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
                style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: difficulty === d.value ? subjectColor : '#e2e8f0', background: difficulty === d.value ? subjectColor : 'white', color: difficulty === d.value ? 'white' : '#64748b' }}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <p style={{ ...subTitleStyle, fontWeight: 600, marginBottom: '8px' }}>題數：<span style={{ color: subjectColor, fontWeight: 700 }}>{count}</span> 題</p>
          <input type="range" min={3} max={30} value={count} onChange={e => setCount(+e.target.value)} style={{ width: '100%', accentColor: subjectColor }}/>
        </div>
        
        {wrongAnswers.length > 0 && (
          <div style={{ ...cardStyle, padding: '16px', marginBottom: '16px' }}>
            <p style={{ ...subTitleStyle, fontWeight: 600, marginBottom: '8px' }}>📊 弱點優先模式</p>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 10px' }}>
              你目前有 {wrongAnswers.length} 題錯題，開啟後會針對弱點章節加倍出題
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setWeakFocus(false)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: weakFocus ? '1.5px solid #e2e8f0' : `2px solid ${subjectColor}`, background: weakFocus ? 'white' : `${subjectColor}15`, color: weakFocus ? '#64748b' : subjectColor, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                ⚪ 平均出題
              </button>
              <button onClick={() => setWeakFocus(true)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: !weakFocus ? '1.5px solid #e2e8f0' : `2px solid ${subjectColor}`, background: !weakFocus ? 'white' : `${subjectColor}15`, color: !weakFocus ? '#64748b' : subjectColor, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                🎯 弱點優先
              </button>
            </div>
          </div>
        )}
        
        <div style={{ display: 'none' }}>
          <input style={{ display: 'none' }}/>
        </div>
        <button onClick={startQuiz} style={{ width: '100%', padding: '14px', borderRadius: '10px', background: subjectColor, color: 'white', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
          開始複習 🚀
        </button>
      </div>
    )
  }

  if (phase === 'loading') return (
    <div style={{ ...containerStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
      <Loader2 size={36} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }}/>
      <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>AI 正在生成題目…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

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
          <div key={i} style={{ ...cardStyle, marginBottom: '8px', borderColor: isCorrect ? '#10b981' : isWrong ? '#ef4444' : '#e2e8f0', borderWidth: checked ? '2px' : '1px', padding: checked ? '13px' : '14px' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: '0 0 4px' }}>{i+1}. {q.text.replace('___', '▢▢▢')}</p>
            {q.lesson && <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 10px', fontWeight: 400 }}>[{q.lesson}]</p>}
            <input disabled={checked} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', color: '#1e293b', background: '#f8fafc', boxSizing: 'border-box' }} placeholder="填入答案…" value={answers[i] ?? ''} onChange={e => setAnswers(a => ({ ...a, [i]: e.target.value }))}/>
            {checked && isWrong && <p style={{ fontSize: '12px', color: '#10b981', marginTop: '6px', marginBottom: 0, fontWeight: 600 }}>✓ 正確答案：{q.blanks?.[0]}</p>}
          </div>
        )
      })}
      {!checked ? (
        <button onClick={checkAnswers} style={{ width: '100%', padding: '14px', borderRadius: '10px', background: '#2563eb', color: 'white', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer', marginTop: '8px' }}>批改答案</button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
          {checked && examSummary && (
        <div style={{ ...cardStyle, padding: '16px', marginBottom: '12px', background: 'linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%)', border: '1.5px solid #fde68a' }}>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#854f0b', margin: '0 0 12px' }}>
            🤖 AI 觀念分析（{examSummary.weakConcepts?.length || 0} 個需加強的觀念）
          </p>
          {examSummary.weakConcepts?.map((wc: any, i: number) => (
            <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '14px', marginBottom: '10px', borderLeft: '4px solid #ef4444' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>
                🔴 第 {wc.questionIndex} 題：{wc.concept}
              </p>
              {wc.lesson && <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 10px' }}>📖 出自：{wc.lesson}</p>}
              <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#475569', margin: '0 0 4px' }}>📚 課本說明</p>
                <p style={{ fontSize: '12px', color: '#1e293b', margin: 0, lineHeight: 1.6 }}>{wc.textbookExplanation}</p>
              </div>
              <div style={{ background: '#fef2f2', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#991b1b', margin: '0 0 4px' }}>💡 你的盲點</p>
                <p style={{ fontSize: '12px', color: '#1e293b', margin: 0, lineHeight: 1.6 }}>{wc.whyWrong}</p>
              </div>
              <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '10px 12px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#166534', margin: '0 0 4px' }}>✅ 正確推理</p>
                <p style={{ fontSize: '12px', color: '#1e293b', margin: 0, lineHeight: 1.6 }}>{wc.correctReasoning}</p>
              </div>
            </div>
          ))}
          {examSummary.overallAdvice && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '14px', borderLeft: '4px solid #a78bfa', marginTop: '4px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#4c1d95', margin: '0 0 6px' }}>
                💡 AI 學習建議
              </p>
              <p style={{ fontSize: '12px', color: '#1e293b', margin: 0, lineHeight: 1.7 }}>
                {examSummary.overallAdvice}
              </p>
            </div>
          )}
        </div>
      )}
      
      {checked && summaryLoading && (
        <div style={{ ...cardStyle, padding: '16px', marginBottom: '12px', textAlign: 'center', background: '#fef3c7' }}>
          <p style={{ fontSize: '13px', color: '#854f0b', margin: 0 }}>
            🤖 AI 正在分析你的弱點觀念...（約 30 秒）
          </p>
        </div>
      )}

      {wrongSavedMsg && <div style={{ padding: '10px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', fontSize: '13px', color: '#166534', textAlign: 'center', fontWeight: 600 }}>{wrongSavedMsg}</div>}
          {!savedSession && (
            <button onClick={saveWrongAnswers} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#f59e0b', color: 'white', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Save size={16}/> 儲存錯題到錯題本
            </button>
          )}
          <button onClick={reset} style={{ width: '100%', padding: '14px', borderRadius: '10px', background: '#64748b', color: 'white', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>再練一次</button>
        </div>
      )}
    </div>
  )

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
          <div key={i} style={{ ...cardStyle, marginBottom: '8px', borderColor: isCorrect ? '#10b981' : isWrong ? '#ef4444' : '#e2e8f0', borderWidth: checked ? '2px' : '1px', padding: checked ? '13px' : '14px' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: '0 0 4px' }}>{i+1}. {q.text}</p>
            {q.lesson && <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 10px', fontWeight: 400 }}>[{q.lesson}]</p>}
            {q.type === 'choice' && q.options ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {q.options.map((opt: string, j: number) => {
                  const letter = ['A','B','C','D'][j]
                  const isAns = letter === q.answer
                  const isPicked = answers[i] === letter
                  return (
                    <button key={j} disabled={checked} onClick={() => setAnswers(a => ({ ...a, [i]: letter }))}
                      style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', cursor: checked ? 'default' : 'pointer', border: '1px solid', borderColor: checked ? (isAns ? '#10b981' : isPicked ? '#ef4444' : '#e2e8f0') : (isPicked ? '#2563eb' : '#e2e8f0'), background: checked ? (isAns ? '#f0fdf4' : isPicked ? '#fef2f2' : 'white') : (isPicked ? '#eff6ff' : 'white'), color: checked ? (isAns ? '#10b981' : isPicked ? '#ef4444' : '#64748b') : (isPicked ? '#2563eb' : '#334155') }}>
                      {letter}. {opt}
                    </button>
                  )
                })}
              </div>
            ) : (
              <input disabled={checked} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', color: '#1e293b', background: '#f8fafc', boxSizing: 'border-box' }} placeholder="填入答案…" value={answers[i] ?? ''} onChange={e => setAnswers(a => ({ ...a, [i]: e.target.value }))}/>
            )}
            {checked && isWrong && <p style={{ fontSize: '12px', color: '#10b981', marginTop: '8px', marginBottom: 0, fontWeight: 600 }}>✓ {q.answer} — {q.explanation}</p>}
          </div>
        )
      })}
      {!checked ? (
        <button onClick={checkAnswers} style={{ width: '100%', padding: '14px', borderRadius: '10px', background: '#2563eb', color: 'white', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer', marginTop: '8px' }}>繳交考卷</button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
          {checked && examSummary && (
        <div style={{ ...cardStyle, padding: '16px', marginBottom: '12px', background: 'linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%)', border: '1.5px solid #fde68a' }}>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#854f0b', margin: '0 0 12px' }}>
            🤖 AI 觀念分析（{examSummary.weakConcepts?.length || 0} 個需加強的觀念）
          </p>
          {examSummary.weakConcepts?.map((wc: any, i: number) => (
            <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '14px', marginBottom: '10px', borderLeft: '4px solid #ef4444' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>
                🔴 第 {wc.questionIndex} 題：{wc.concept}
              </p>
              {wc.lesson && <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 10px' }}>📖 出自：{wc.lesson}</p>}
              <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#475569', margin: '0 0 4px' }}>📚 課本說明</p>
                <p style={{ fontSize: '12px', color: '#1e293b', margin: 0, lineHeight: 1.6 }}>{wc.textbookExplanation}</p>
              </div>
              <div style={{ background: '#fef2f2', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#991b1b', margin: '0 0 4px' }}>💡 你的盲點</p>
                <p style={{ fontSize: '12px', color: '#1e293b', margin: 0, lineHeight: 1.6 }}>{wc.whyWrong}</p>
              </div>
              <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '10px 12px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#166534', margin: '0 0 4px' }}>✅ 正確推理</p>
                <p style={{ fontSize: '12px', color: '#1e293b', margin: 0, lineHeight: 1.6 }}>{wc.correctReasoning}</p>
              </div>
            </div>
          ))}
          {examSummary.overallAdvice && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '14px', borderLeft: '4px solid #a78bfa', marginTop: '4px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#4c1d95', margin: '0 0 6px' }}>
                💡 AI 學習建議
              </p>
              <p style={{ fontSize: '12px', color: '#1e293b', margin: 0, lineHeight: 1.7 }}>
                {examSummary.overallAdvice}
              </p>
            </div>
          )}
        </div>
      )}
      
      {checked && summaryLoading && (
        <div style={{ ...cardStyle, padding: '16px', marginBottom: '12px', textAlign: 'center', background: '#fef3c7' }}>
          <p style={{ fontSize: '13px', color: '#854f0b', margin: 0 }}>
            🤖 AI 正在分析你的弱點觀念...（約 30 秒）
          </p>
        </div>
      )}

      {wrongSavedMsg && <div style={{ padding: '10px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', fontSize: '13px', color: '#166534', textAlign: 'center', fontWeight: 600 }}>{wrongSavedMsg}</div>}
          {!savedSession && (
            <button onClick={saveWrongAnswers} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#f59e0b', color: 'white', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Save size={16}/> 儲存錯題到錯題本
            </button>
          )}
          <button onClick={reset} style={{ width: '100%', padding: '14px', borderRadius: '10px', background: '#64748b', color: 'white', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>重新出題</button>
        </div>
      )}
    </div>
  )

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
