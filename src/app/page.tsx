'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Plus, BookOpen, X, Pencil, Camera, Trash2, Loader2 } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [children, setChildren] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingChild, setEditingChild] = useState<any>(null)
  const [formName, setFormName] = useState('')
  const [formGrade, setFormGrade] = useState('國二（八年級）')
  const [formEmoji, setFormEmoji] = useState('📚')
  const [formAvatarUrl, setFormAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const GRADES = ['國一（七年級）','國二（八年級）','國三（九年級）','國小四年級','國小五年級','國小六年級']
  const EMOJIS = ['📚','🌟','🎯','🚀','💡','🎨','⚽','🎵','🦄','🐱','🐶','🦊']

  useEffect(() => { loadChildren() }, [])

  async function loadChildren() {
    const { data } = await supabase.from('children').select('*').order('created_at')
    setChildren(data ?? [])
    setLoading(false)
  }

  function openAddForm() {
    setEditingChild(null)
    setFormName('')
    setFormGrade('國二（八年級）')
    setFormEmoji('📚')
    setFormAvatarUrl('')
    setShowForm(true)
  }

  function openEditForm(child: any) {
    setEditingChild(child)
    setFormName(child.name)
    setFormGrade(child.grade)
    setFormEmoji(child.avatar || '📚')
    setFormAvatarUrl(child.avatar_url || '')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingChild(null)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('請選擇圖片檔案')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('圖片不能超過 5MB')
      return
    }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `avatar_${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('child-avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: true })
      if (uploadError) {
        alert('上傳失敗：' + uploadError.message)
        setUploading(false)
        return
      }
      const { data } = supabase.storage.from('child-avatars').getPublicUrl(fileName)
      setFormAvatarUrl(data.publicUrl)
    } catch (e: any) {
      alert('錯誤：' + e.message)
    }
    setUploading(false)
  }

  async function saveChild() {
    if (!formName.trim()) return

    if (editingChild) {
      // 更新現有孩子
      const { error } = await supabase
        .from('children')
        .update({
          name: formName.trim(),
          grade: formGrade,
          avatar: formEmoji,
          avatar_url: formAvatarUrl || null,
        })
        .eq('id', editingChild.id)
      if (error) {
        alert('更新失敗：' + error.message)
        return
      }
      // 如果這個是當前選中的孩子，更新 localStorage
      const stored = localStorage.getItem('selectedChild')
      if (stored) {
        const c = JSON.parse(stored)
        if (c.id === editingChild.id) {
          localStorage.setItem('selectedChild', JSON.stringify({
            ...c,
            name: formName.trim(),
            grade: formGrade,
            avatar: formEmoji,
            avatar_url: formAvatarUrl || null,
          }))
        }
      }
    } else {
      // 新增孩子
      const { data } = await supabase.from('children').insert({
        name: formName.trim(),
        grade: formGrade,
        avatar: formEmoji,
        avatar_url: formAvatarUrl || null,
        color: '#2563eb',
      }).select().single()
      if (data) {
        await supabase.from('subjects').insert([
          { child_id: data.id, name: '國語', emoji: '📖', color: '#d97706', sort_order: 0 },
          { child_id: data.id, name: '英文', emoji: '🔤', color: '#2563eb', sort_order: 1 },
          { child_id: data.id, name: '數學', emoji: '📐', color: '#059669', sort_order: 2 },
          { child_id: data.id, name: '理化', emoji: '🔬', color: '#ea580c', sort_order: 3 },
          { child_id: data.id, name: '社會', emoji: '🌏', color: '#7c3aed', sort_order: 4 },
        ])
        await supabase.from('study_streaks').insert({ child_id: data.id })
      }
    }
    closeForm()
    loadChildren()
  }

  async function deleteChild() {
    if (!editingChild) return
    if (!confirm(`確定要刪除「${editingChild.name}」嗎？\n\n這會刪除所有相關資料（課文、錯題、學習記錄等），且無法復原！`)) return
    const { error } = await supabase.from('children').delete().eq('id', editingChild.id)
    if (error) {
      alert('刪除失敗：' + error.message)
      return
    }
    // 如果刪的是當前選中的孩子，清空 localStorage
    const stored = localStorage.getItem('selectedChild')
    if (stored) {
      const c = JSON.parse(stored)
      if (c.id === editingChild.id) {
        localStorage.removeItem('selectedChild')
        localStorage.removeItem('selectedChildId')
      }
    }
    closeForm()
    loadChildren()
  }

  function selectChild(child: any) {
    localStorage.setItem('selectedChildId', child.id)
    localStorage.setItem('selectedChild', JSON.stringify(child))
    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#eff6ff 0%,#f8fafc 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ fontSize: '56px', marginBottom: '12px' }}>🏠</div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>彭家 AI 家教</h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Peng Family AI Tutor Platform</p>
      </div>

      <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading && [1, 2].map(i => <div key={i} style={{ height: '88px', background: '#e2e8f0', borderRadius: '16px' }}/>)}

        {children.map(child => (
          <div key={child.id} style={{ position: 'relative', width: '100%' }}>
            <button onClick={() => selectChild(child)}
              style={{ width: '100%', background: 'white', border: '2px solid #e2e8f0', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0, overflow: 'hidden' }}>
                {child.avatar_url ? (
                  <img src={child.avatar_url} alt={child.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                ) : (
                  child.avatar || '📚'
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '17px' }}>{child.name}</div>
                <div style={{ color: '#64748b', fontSize: '13px', marginTop: '2px' }}>{child.grade}</div>
              </div>
              <BookOpen size={20} color="#94a3b8"/>
            </button>
            <button onClick={() => openEditForm(child)}
              style={{ position: 'absolute', top: '8px', right: '8px', width: '32px', height: '32px', borderRadius: '8px', background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <Pencil size={14} color="#64748b"/>
            </button>
          </div>
        ))}

        {!showForm ? (
          <button onClick={openAddForm}
            style={{ width: '100%', border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#64748b', cursor: 'pointer', background: 'transparent', fontSize: '14px', fontWeight: 500 }}>
            <Plus size={18}/> 新增孩子
          </button>
        ) : (
          <div style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>{editingChild ? '編輯孩子' : '新增孩子'}</h3>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18}/></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* 大頭照預覽 + 上傳 */}
              <div>
                <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 8px' }}>大頭照</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '72px', height: '72px', borderRadius: '16px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', overflow: 'hidden', border: '2px solid #e2e8f0', flexShrink: 0 }}>
                    {formAvatarUrl ? (
                      <img src={formAvatarUrl} alt="預覽" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                    ) : (
                      formEmoji
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', fontSize: '13px', fontWeight: 600, cursor: uploading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      {uploading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }}/> 上傳中…</> : <><Camera size={14}/> {formAvatarUrl ? '更換照片' : '上傳照片'}</>}
                    </button>
                    {formAvatarUrl && (
                      <button onClick={() => setFormAvatarUrl('')}
                        style={{ padding: '6px 10px', borderRadius: '8px', border: '1.5px solid #fee2e2', background: '#fef2f2', color: '#dc2626', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                        移除照片，改用 emoji
                      </button>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }}/>
                </div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>

              {/* Emoji 選擇（沒上傳照片時用） */}
              {!formAvatarUrl && (
                <div>
                  <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 8px' }}>或選擇 emoji 頭像</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {EMOJIS.map(e => (
                      <button key={e} onClick={() => setFormEmoji(e)}
                        style={{ width: '40px', height: '40px', borderRadius: '10px', fontSize: '20px', border: '2px solid', borderColor: formEmoji === e ? '#2563eb' : '#e2e8f0', background: formEmoji === e ? '#eff6ff' : '#f8fafc', cursor: 'pointer' }}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 姓名 */}
              <div>
                <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 6px' }}>姓名</p>
                <input style={{ width: '100%', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }}
                  placeholder="孩子姓名" value={formName} onChange={e => setFormName(e.target.value)} autoFocus={!editingChild}/>
              </div>

              {/* 年級 */}
              <div>
                <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 6px' }}>年級</p>
                <select style={{ width: '100%', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', color: '#1e293b', outline: 'none' }}
                  value={formGrade} onChange={e => setFormGrade(e.target.value)}>
                  {GRADES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>

              {/* 操作按鈕 */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                {editingChild && (
                  <button onClick={deleteChild}
                    style={{ padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #fee2e2', background: '#fef2f2', color: '#dc2626', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Trash2 size={14}/>
                  </button>
                )}
                <button onClick={closeForm}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}>
                  取消
                </button>
                <button onClick={saveChild} disabled={!formName.trim()}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: formName.trim() ? '#2563eb' : '#cbd5e1', color: 'white', fontSize: '14px', cursor: formName.trim() ? 'pointer' : 'not-allowed', fontWeight: 600 }}>
                  {editingChild ? '儲存' : '新增'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '48px' }}>目標：考上第一志願 🎯</p>
    </div>
  )
}
