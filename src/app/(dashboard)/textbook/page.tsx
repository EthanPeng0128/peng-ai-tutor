'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { GRADES, SEMESTERS, SUB_SUBJECTS } from '@/lib/constants'
import { Plus, Upload, Camera, ChevronRight, ChevronDown, Search, FolderOpen, X, BookOpen } from 'lucide-react'

type UploadPath = {
  subjectName: string; grade: string; semester: string
  subSubject: string; lessonNumber: string; title: string; section: string
}

export default function TextbookPage() {
  const router = useRouter()
  const [childId, setChildId] = useState('')
  const [subjects, setSubjects] = useState<any[]>([])
  const [textbooks, setTextbooks] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadPath, setUploadPath] = useState<UploadPath>({
    subjectName: '國語', grade: '國二', semester: '上學期',
    subSubject: '', lessonNumber: '第1課', title: '', section: '',
  })
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const id = localStorage.getItem('selectedChildId') ?? ''
    setChildId(id)
    if (id) loadData(id)
  }, [])

  async function loadData(id: string) {
    const [{ data: subs }, { data: books }] = await Promise.all([
      supabase.from('subjects').select('*').eq('child_id', id).order('sort_order'),
      supabase.from('textbooks').select('*').eq('child_id', id).order('created_at', { ascending: false }),
    ])
    setSubjects(subs ?? [])
    setTextbooks(books ?? [])
  }

  function toggle(name: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n })
  }

  function getGrouped() {
    const filtered = textbooks.filter(t =>
      !search || t.title.includes(search) || t.lesson_number.includes(search) || t.subject_name.includes(search)
    )
    const groups: Record<string, typeof filtered> = {}
    filtered.forEach(t => { if (!groups[t.subject_name]) groups[t.subject_name] = []; groups[t.subject_name].push(t) })
    return groups
  }

  async function handleFile(file: File) {
    if (!file || !uploadPath.title) { alert('請先填寫課程標題'); return }
    setUploading(true)
    try {
      // Step 1: Upload directly to Supabase Storage (no Vercel size limit, up to 50MB)
      const ext = file.name.split('.').pop()
      const storagePath = `${childId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('textbook-files').upload(storagePath, file, {
        cacheControl: '3600', upsert: false
      })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('textbook-files').getPublicUrl(storagePath)

      // Step 2: AI parse - only for images (PDF too large for Vercel API)
      let parsedContent = ''
      const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf')
      if (!isPDF) {
        // Image: convert to base64 and send to AI
        const reader = new FileReader()
        parsedContent = await new Promise((resolve) => {
          reader.onload = async (e) => {
            const dataUrl = e.target?.result as string
            const base64 = dataUrl.split(',')[1]
            try {
              const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base64, mimeType: file.type || 'image/jpeg' })
              })
              const data = await res.json()
              resolve(data.content ?? '')
            } catch { resolve('') }
          }
          reader.readAsDataURL(file)
        })
      } else {
        parsedContent = '（PDF課文已上傳，內容將在複習時由AI直接分析）'
      }

      // Step 3: Save to database
      const subject = subjects.find(s => s.name === uploadPath.subjectName)
      await supabase.from('textbooks').insert({
        child_id: childId, subject_id: subject?.id,
        subject_name: uploadPath.subjectName, grade: uploadPath.grade,
        semester: uploadPath.semester, sub_subject: uploadPath.subSubject || null,
        lesson_number: uploadPath.lessonNumber, title: uploadPath.title,
        section: uploadPath.section || null, content: parsedContent,
        original_url: publicUrl, status: 'ready',
      })
      setShowUpload(false)
      loadData(childId)
    } catch (e: any) { console.error(e); alert('上傳失敗：' + (e.message || '請再試一次')) }
    setUploading(false)
  }

  const grouped = getGrouped()
  const hasSocial = uploadPath.subjectName === '社會'

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-slate-600 focus:outline-none"
            placeholder="搜尋課文…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {subjects.map(subject => {
          const sBooks = grouped[subject.name] ?? []
          const isExpanded = expanded.has(subject.name)
          return (
            <div key={subject.id} className="card overflow-hidden">
              <button onClick={() => toggle(subject.name)}
                className="w-full flex items-center gap-3 p-4 hover:bg-slate-800/50 transition-colors">
                <span className="text-xl">{subject.emoji}</span>
                <div className="flex-1 text-left">
                  <span className="font-medium text-white text-sm">{subject.name}</span>
                  <span className="text-slate-500 text-xs ml-2">{sBooks.length} 份</span>
                </div>
                <ChevronDown size={16} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
              {isExpanded && (
                <div className="border-t border-slate-800">
                  {sBooks.length === 0 ? (
                    <div className="p-4 text-center text-slate-600 text-sm">尚未上傳課文</div>
                  ) : (
                    <div className="divide-y divide-slate-800/50">
                      {sBooks.map(book => (
                        <button key={book.id} onClick={() => router.push(`/textbook/${book.id}`)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/30 text-left">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                            <BookOpen size={14} className="text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{book.lesson_number}：{book.title}</p>
                            <p className="text-xs text-slate-500">{book.grade} · {book.semester}{book.sub_subject ? ` · ${book.sub_subject}` : ''}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${book.status === 'ready' ? 'bg-emerald-400' : 'bg-yellow-400 animate-pulse'}`} />
                            <ChevronRight size={14} className="text-slate-600" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="px-4 pb-4">
        <button onClick={() => setShowUpload(true)}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors">
          <Plus size={18} /> 上傳課文
        </button>
      </div>

      <input ref={fileRef} type="file" className="hidden" accept="image/*,application/pdf,.pdf"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

      {showUpload && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={() => setShowUpload(false)}>
          <div className="w-full max-w-lg mx-auto bg-slate-900 rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-white text-lg">上傳課文</h2>
              <button onClick={() => setShowUpload(false)}><X size={20} className="text-slate-400"/></button>
            </div>
            <div className="space-y-3 mb-5">
              <div className="bg-slate-800 rounded-xl p-3 text-sm text-blue-300 font-mono">
                {uploadPath.subjectName} › {uploadPath.grade} › {uploadPath.semester}
                {uploadPath.subSubject && ` › ${uploadPath.subSubject}`}
                {` › ${uploadPath.lessonNumber}`}
                {uploadPath.title && ` › ${uploadPath.title}`}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">科目</label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    value={uploadPath.subjectName} onChange={e => setUploadPath(p => ({ ...p, subjectName: e.target.value, subSubject: '' }))}>
                    {subjects.map(s => <option key={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">年級</label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    value={uploadPath.grade} onChange={e => setUploadPath(p => ({ ...p, grade: e.target.value }))}>
                    {GRADES.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">學期</label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    value={uploadPath.semester} onChange={e => setUploadPath(p => ({ ...p, semester: e.target.value }))}>
                    {SEMESTERS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                {hasSocial && (
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">細科</label>
                    <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                      value={uploadPath.subSubject} onChange={e => setUploadPath(p => ({ ...p, subSubject: e.target.value }))}>
                      <option value="">（不分科）</option>
                      {SUB_SUBJECTS['社會'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">課次</label>
                  <input className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    placeholder="第1課 / Unit 1" value={uploadPath.lessonNumber} onChange={e => setUploadPath(p => ({ ...p, lessonNumber: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">小節（選填）</label>
                  <input className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    placeholder="1-1 / 3-2" value={uploadPath.section} onChange={e => setUploadPath(p => ({ ...p, section: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">課程標題 *</label>
                <input className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="例：犯罪與刑罰" value={uploadPath.title} onChange={e => setUploadPath(p => ({ ...p, title: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '拍照', icon: <Camera size={24} className="text-blue-400"/>, action: () => { if(fileRef.current){fileRef.current.setAttribute('capture','environment');fileRef.current.accept='image/*';fileRef.current.click()} } },
                { label: 'PDF', icon: <Upload size={24} className="text-emerald-400"/>, action: () => { if(fileRef.current){fileRef.current.removeAttribute('capture');fileRef.current.accept='application/pdf,.pdf';fileRef.current.click()} } },
                { label: '選圖片', icon: <FolderOpen size={24} className="text-purple-400"/>, action: () => { if(fileRef.current){fileRef.current.removeAttribute('capture');fileRef.current.accept='image/*';fileRef.current.click()} } },
              ].map(btn => (
                <button key={btn.label} onClick={btn.action}
                  className="flex flex-col items-center gap-2 p-4 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors">
                  {btn.icon}
                  <span className="text-xs text-slate-300">{btn.label}</span>
                </button>
              ))}
            </div>
            {uploading && (
              <div className="mt-4 flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-blue-400">AI 正在辨識課文內容…</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
