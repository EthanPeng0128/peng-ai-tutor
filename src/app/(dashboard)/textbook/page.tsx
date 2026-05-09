'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { GRADES, SEMESTERS, SUB_SUBJECTS } from '@/lib/constants'
import { Plus, Camera, ChevronRight, ChevronDown, Search, FolderOpen, X, BookOpen, Trash2, Upload, Pencil } from 'lucide-react'

type UploadPath = {
  subjectName: string; grade: string; semester: string
  subSubject: string; lessonNumber: string; title: string; section: string
}

const S = {
  input: { width:'100%', background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:'10px', padding:'10px 14px', fontSize:'14px', color:'#1e293b', outline:'none', boxSizing:'border-box' } as React.CSSProperties,
  select: { width:'100%', background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:'10px', padding:'10px 14px', fontSize:'14px', color:'#1e293b', outline:'none' } as React.CSSProperties,
  label: { fontSize:'12px', color:'#64748b', display:'block', marginBottom:'4px', fontWeight:'500' } as React.CSSProperties,
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
  const [uploadMsg, setUploadMsg] = useState('')
  const [deleting, setDeleting] = useState<string|null>(null)
  const [editing, setEditing] = useState<any>(null)
  const [editPath, setEditPath] = useState<UploadPath>({ subjectName:'', grade:'', semester:'', subSubject:'', lessonNumber:'', title:'', section:'' })
  const [saving, setSaving] = useState(false)
  const [uploadPath, setUploadPath] = useState<UploadPath>({
    subjectName:'國語', grade:'國二', semester:'上學期',
    subSubject:'', lessonNumber:'第1課', title:'', section:'',
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
      supabase.from('textbooks').select('*').eq('child_id', id).order('created_at', { ascending: true }),
    ])
    setSubjects(subs ?? [])
    setTextbooks(books ?? [])
  }

  function toggle(name: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n })
  }

  async function deleteTextbook(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('確定要刪除這份課文嗎？')) return
    setDeleting(id)
    await supabase.from('textbooks').delete().eq('id', id)
    setTextbooks(prev => prev.filter(t => t.id !== id))
    setDeleting(null)
  }

  function openEdit(book: any, e: React.MouseEvent) {
    e.stopPropagation()
    setEditing(book)
    setEditPath({
      subjectName: book.subject_name || '國語',
      grade: book.grade || '國二',
      semester: book.semester || '上學期',
      subSubject: book.sub_subject || '',
      lessonNumber: book.lesson_number || '',
      title: book.title || '',
      section: book.section || '',
    })
  }

  async function saveEdit() {
    if (!editing || !editPath.title.trim()) {
      alert('請填寫課程標題')
      return
    }
    setSaving(true)
    try {
      const subject = subjects.find(s => s.name === editPath.subjectName)
      const { error } = await supabase
        .from('textbooks')
        .update({
          subject_id: subject?.id,
          subject_name: editPath.subjectName,
          grade: editPath.grade,
          semester: editPath.semester,
          sub_subject: editPath.subSubject || null,
          lesson_number: editPath.lessonNumber,
          title: editPath.title.trim(),
          section: editPath.section || null,
        })
        .eq('id', editing.id)
      if (error) throw error
      setEditing(null)
      loadData(childId)
    } catch (e: any) {
      alert('儲存失敗：' + e.message)
    }
    setSaving(false)
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
    setUploadMsg('上傳檔案中...')
    try {
      const ext = file.name.split('.').pop()
      const storagePath = `${childId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('textbook-files').upload(storagePath, file, { cacheControl:'3600', upsert:false })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('textbook-files').getPublicUrl(storagePath)

      const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf')
      let parsedContent = ''

      if (isPDF) {
        setUploadMsg('AI 正在解析 PDF，請稍候（約30秒）...')
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfUrl: publicUrl })
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        parsedContent = data.content ?? ''
      } else {
        setUploadMsg('AI 正在辨識圖片文字...')
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
      }

      setUploadMsg('儲存中...')
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
      setUploadMsg('')
      loadData(childId)
    } catch (e: any) {
      console.error(e)
      alert('上傳失敗：' + (e.message || '請再試一次'))
    }
    setUploading(false)
    setUploadMsg('')
  }

  const grouped = getGrouped()
  const hasSocial = uploadPath.subjectName === '社會'
  const editHasSocial = editPath.subjectName === '社會'

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#f8fafc'}}>
      <div style={{padding:'12px 16px 8px'}}>
        <div style={{position:'relative'}}>
          <Search size={16} style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)',color:'#94a3b8'}}/>
          <input style={{...S.input, paddingLeft:'36px'}} placeholder="搜尋課文…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'0 16px 16px',display:'flex',flexDirection:'column',gap:'8px'}}>
        {subjects.map(subject => {
          const sBooks = grouped[subject.name] ?? []
          const isExpanded = expanded.has(subject.name)
          return (
            <div key={subject.id} style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'14px',overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
              <button onClick={() => toggle(subject.name)} style={{width:'100%',display:'flex',alignItems:'center',gap:'12px',padding:'14px 16px',background:'none',border:'none',cursor:'pointer'}}>
                <span style={{fontSize:'22px'}}>{subject.emoji}</span>
                <div style={{flex:1,textAlign:'left'}}>
                  <span style={{fontWeight:'600',color:'#1e293b',fontSize:'14px'}}>{subject.name}</span>
                  <span style={{color:'#94a3b8',fontSize:'12px',marginLeft:'8px'}}>{sBooks.length} 份</span>
                </div>
                <ChevronDown size={16} style={{color:'#94a3b8',transform:isExpanded?'rotate(180deg)':'none',transition:'transform 0.2s'}}/>
              </button>

              {isExpanded && (
                <div style={{borderTop:'1px solid #f1f5f9',maxHeight:'400px',overflowY:'auto',WebkitOverflowScrolling:'touch'}}>
                  {sBooks.length === 0 ? (
                    <div style={{padding:'16px',textAlign:'center',color:'#94a3b8',fontSize:'13px'}}>尚未上傳課文</div>
                  ) : (
                    sBooks.map(book => (
                      <div key={book.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',borderBottom:'1px solid #f8fafc',cursor:'pointer'}}
                        onClick={() => router.push(`/textbook/${book.id}`)}>
                        <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <BookOpen size={16} color="#64748b"/>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{fontSize:'14px',color:'#0f172a',fontWeight:'700',margin:0}}>{book.grade} · {book.semester}{book.sub_subject?` · ${book.sub_subject}`:''}</p>
                          <p style={{fontSize:'13px',color:'#1e293b',fontWeight:'500',margin:'2px 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{book.lesson_number}：{book.title}</p>
                          {book.created_at && <p style={{fontSize:'10px',color:'#94a3b8',margin:'2px 0 0'}}>上傳時間：{new Date(book.created_at).toLocaleString('zh-TW',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})}</p>}
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                          <div style={{width:'8px',height:'8px',borderRadius:'50%',background:book.status==='ready'?'#22c55e':'#f59e0b',flexShrink:0}}/>
                          <button onClick={e => openEdit(book, e)}
                            style={{width:'30px',height:'30px',borderRadius:'8px',border:'1px solid #e0f2fe',background:'#f0f9ff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
                            title="編輯課文">
                            <Pencil size={14} color="#0284c7"/>
                          </button>
                          <button onClick={e => deleteTextbook(book.id, e)}
                            style={{width:'30px',height:'30px',borderRadius:'8px',border:'1px solid #fee2e2',background:'#fff5f5',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',opacity:deleting===book.id?0.5:1}}
                            title="刪除課文">
                            <Trash2 size={14} color="#ef4444"/>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{padding:'12px 16px 16px',background:'#f8fafc',borderTop:'1px solid #e2e8f0'}}>
        <button onClick={() => setShowUpload(true)} style={{width:'100%',background:'#2563eb',color:'white',border:'none',borderRadius:'12px',padding:'13px',fontSize:'15px',fontWeight:'600',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
          <Plus size={18}/> 上傳課文
        </button>
      </div>

      <input ref={fileRef} type="file" style={{display:'none'}} accept="image/*,application/pdf,.pdf"
        onChange={e => { const f=e.target.files?.[0]; if(f) handleFile(f) }}/>

      {/* 編輯彈窗 */}
      {editing && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:50,display:'flex',alignItems:'flex-end'}} onClick={() => !saving && setEditing(null)}>
          <div style={{width:'100%',maxWidth:'480px',margin:'0 auto',background:'white',borderRadius:'24px 24px 0 0',padding:'24px',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h2 style={{fontSize:'18px',fontWeight:'700',color:'#1e293b',margin:0}}>✏️ 編輯課文</h2>
              {!saving && <button onClick={() => setEditing(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#94a3b8'}}><X size={20}/></button>}
            </div>

            <div style={{background:'#fef3c7',border:'1px solid #fde68a',borderRadius:'10px',padding:'10px 14px',fontSize:'12px',color:'#854d0e',marginBottom:'16px'}}>
              💡 修改科目後，這份課文會自動移到對應的科目資料夾
            </div>

            <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:'10px',padding:'10px 14px',fontSize:'13px',color:'#1d4ed8',fontFamily:'monospace',marginBottom:'16px'}}>
              {editPath.subjectName} › {editPath.grade} › {editPath.semester}
              {editPath.subSubject && ` › ${editPath.subSubject}`}
              {` › ${editPath.lessonNumber}`}
              {editPath.title && ` › ${editPath.title}`}
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:'12px',marginBottom:'20px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={S.label}>科目</label>
                  <select style={S.select} value={editPath.subjectName} onChange={e=>setEditPath(p=>({...p,subjectName:e.target.value,subSubject:''}))}>
                    {subjects.map(s=><option key={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>年級</label>
                  <select style={S.select} value={editPath.grade} onChange={e=>setEditPath(p=>({...p,grade:e.target.value}))}>
                    {GRADES.map(g=><option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>學期</label>
                  <select style={S.select} value={editPath.semester} onChange={e=>setEditPath(p=>({...p,semester:e.target.value}))}>
                    {SEMESTERS.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                {editHasSocial && (
                  <div>
                    <label style={S.label}>細科</label>
                    <select style={S.select} value={editPath.subSubject} onChange={e=>setEditPath(p=>({...p,subSubject:e.target.value}))}>
                      <option value="">（不分科）</option>
                      {SUB_SUBJECTS['社會'].map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={S.label}>課次</label>
                  <input style={S.input} placeholder="第1課 / Unit 1" value={editPath.lessonNumber} onChange={e=>setEditPath(p=>({...p,lessonNumber:e.target.value}))}/>
                </div>
                <div>
                  <label style={S.label}>小節（選填）</label>
                  <input style={S.input} placeholder="1-1 / 3-2" value={editPath.section} onChange={e=>setEditPath(p=>({...p,section:e.target.value}))}/>
                </div>
              </div>
              <div>
                <label style={S.label}>課程標題 *</label>
                <input style={{...S.input,borderColor:editPath.title?'#e2e8f0':'#fca5a5'}} placeholder="例：犯罪與刑罰" value={editPath.title} onChange={e=>setEditPath(p=>({...p,title:e.target.value}))}/>
              </div>
            </div>

            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={() => setEditing(null)} disabled={saving}
                style={{flex:1,padding:'12px',borderRadius:'10px',border:'1.5px solid #e2e8f0',background:'white',color:'#64748b',fontSize:'14px',cursor:saving?'wait':'pointer',fontWeight:500}}>
                取消
              </button>
              <button onClick={saveEdit} disabled={saving || !editPath.title.trim()}
                style={{flex:1,padding:'12px',borderRadius:'10px',border:'none',background:saving||!editPath.title.trim()?'#cbd5e1':'#2563eb',color:'white',fontSize:'14px',cursor:saving||!editPath.title.trim()?'not-allowed':'pointer',fontWeight:600}}>
                {saving ? '儲存中…' : '儲存變更'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 上傳彈窗 */}
      {showUpload && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:50,display:'flex',alignItems:'flex-end'}} onClick={() => !uploading && setShowUpload(false)}>
          <div style={{width:'100%',maxWidth:'480px',margin:'0 auto',background:'white',borderRadius:'24px 24px 0 0',padding:'24px',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h2 style={{fontSize:'18px',fontWeight:'700',color:'#1e293b',margin:0}}>上傳課文</h2>
              {!uploading && <button onClick={() => setShowUpload(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#94a3b8'}}><X size={20}/></button>}
            </div>

            <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:'10px',padding:'10px 14px',fontSize:'13px',color:'#1d4ed8',fontFamily:'monospace',marginBottom:'16px'}}>
              {uploadPath.subjectName} › {uploadPath.grade} › {uploadPath.semester}
              {uploadPath.subSubject && ` › ${uploadPath.subSubject}`}
              {` › ${uploadPath.lessonNumber}`}
              {uploadPath.title && ` › ${uploadPath.title}`}
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:'12px',marginBottom:'20px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={S.label}>科目</label>
                  <select style={S.select} value={uploadPath.subjectName} onChange={e=>setUploadPath(p=>({...p,subjectName:e.target.value,subSubject:''}))}>
                    {subjects.map(s=><option key={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>年級</label>
                  <select style={S.select} value={uploadPath.grade} onChange={e=>setUploadPath(p=>({...p,grade:e.target.value}))}>
                    {GRADES.map(g=><option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>學期</label>
                  <select style={S.select} value={uploadPath.semester} onChange={e=>setUploadPath(p=>({...p,semester:e.target.value}))}>
                    {SEMESTERS.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                {hasSocial && (
                  <div>
                    <label style={S.label}>細科</label>
                    <select style={S.select} value={uploadPath.subSubject} onChange={e=>setUploadPath(p=>({...p,subSubject:e.target.value}))}>
                      <option value="">（不分科）</option>
                      {SUB_SUBJECTS['社會'].map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={S.label}>課次</label>
                  <input style={S.input} placeholder="第1課 / Unit 1" value={uploadPath.lessonNumber} onChange={e=>setUploadPath(p=>({...p,lessonNumber:e.target.value}))}/>
                </div>
                <div>
                  <label style={S.label}>小節（選填）</label>
                  <input style={S.input} placeholder="1-1 / 3-2" value={uploadPath.section} onChange={e=>setUploadPath(p=>({...p,section:e.target.value}))}/>
                </div>
              </div>
              <div>
                <label style={S.label}>課程標題 *</label>
                <input style={{...S.input,borderColor:uploadPath.title?'#e2e8f0':'#fca5a5'}} placeholder="例：犯罪與刑罰" value={uploadPath.title} onChange={e=>setUploadPath(p=>({...p,title:e.target.value}))}/>
              </div>
            </div>

            {uploading ? (
              <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:'12px',padding:'16px',display:'flex',alignItems:'center',gap:'12px'}}>
                <div style={{width:'20px',height:'20px',border:'3px solid #bfdbfe',borderTopColor:'#2563eb',borderRadius:'50%',animation:'spin 1s linear infinite',flexShrink:0}}/>
                <span style={{fontSize:'14px',color:'#1d4ed8',fontWeight:'500'}}>{uploadMsg}</span>
              </div>
            ) : (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}>
                {[
                  {label:'拍照', icon:<Camera size={22} color="#2563eb"/>, bg:'#eff6ff', border:'#bfdbfe', action:()=>{if(fileRef.current){fileRef.current.setAttribute('capture','environment');fileRef.current.accept='image/*';fileRef.current.click()}}},
                  {label:'PDF', icon:<Upload size={22} color="#7c3aed"/>, bg:'#f5f3ff', border:'#ddd6fe', action:()=>{if(fileRef.current){fileRef.current.removeAttribute('capture');fileRef.current.accept='application/pdf,.pdf';fileRef.current.click()}}},
                  {label:'選圖片', icon:<FolderOpen size={22} color="#059669"/>, bg:'#f0fdf4', border:'#bbf7d0', action:()=>{if(fileRef.current){fileRef.current.removeAttribute('capture');fileRef.current.accept='image/*';fileRef.current.click()}}},
                ].map(btn=>(
                  <button key={btn.label} onClick={btn.action} style={{background:btn.bg,border:`1.5px solid ${btn.border}`,borderRadius:'12px',padding:'16px 8px',display:'flex',flexDirection:'column',alignItems:'center',gap:'8px',cursor:'pointer'}}>
                    {btn.icon}
                    <span style={{fontSize:'13px',color:'#1e293b',fontWeight:'500'}}>{btn.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
