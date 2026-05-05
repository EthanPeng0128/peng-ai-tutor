'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Plus, BookOpen, X } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [children, setChildren] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGrade, setNewGrade] = useState('國二（八年級）')
  const [newEmoji, setNewEmoji] = useState('📚')
  const GRADES = ['國一（七年級）','國二（八年級）','國三（九年級）','國小四年級','國小五年級','國小六年級']
  const EMOJIS = ['📚','🌟','🎯','🚀','💡','🎨','⚽','🎵']

  useEffect(() => { loadChildren() }, [])

  async function loadChildren() {
    const { data } = await supabase.from('children').select('*').order('created_at')
    setChildren(data ?? [])
    setLoading(false)
  }

  async function addChild() {
    if (!newName.trim()) return
    const { data } = await supabase.from('children').insert({ name: newName.trim(), grade: newGrade, avatar: newEmoji, color: '#2563eb' }).select().single()
    if (data) {
      await supabase.from('subjects').insert([
        { child_id: data.id, name: '國語', emoji: '📖', color: '#d97706', sort_order: 0 },
        { child_id: data.id, name: '英文', emoji: '🔤', color: '#2563eb', sort_order: 1 },
        { child_id: data.id, name: '數學', emoji: '📐', color: '#059669', sort_order: 2 },
        { child_id: data.id, name: '理化', emoji: '🔬', color: '#ea580c', sort_order: 3 },
        { child_id: data.id, name: '社會', emoji: '🌏', color: '#7c3aed', sort_order: 4 },
      ])
      await supabase.from('study_streaks').insert({ child_id: data.id })
      setNewName(''); setShowAdd(false); loadChildren()
    }
  }

  function selectChild(child: any) {
    localStorage.setItem('selectedChildId', child.id)
    localStorage.setItem('selectedChild', JSON.stringify(child))
    router.push('/dashboard')
  }

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#eff6ff 0%,#f8fafc 100%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px'}}>
      <div style={{textAlign:'center',marginBottom:'48px'}}>
        <div style={{fontSize:'56px',marginBottom:'12px'}}>🏠</div>
        <h1 style={{fontSize:'28px',fontWeight:'800',color:'#1e293b',margin:'0 0 4px'}}>彭家 AI 家教</h1>
        <p style={{color:'#64748b',fontSize:'14px',margin:0}}>Peng Family AI Tutor Platform</p>
      </div>

      <div style={{width:'100%',maxWidth:'400px',display:'flex',flexDirection:'column',gap:'12px'}}>
        {loading && [1,2].map(i => <div key={i} style={{height:'88px',background:'#e2e8f0',borderRadius:'16px',animation:'pulse 2s infinite'}}/>)}

        {children.map(child => (
          <button key={child.id} onClick={() => selectChild(child)} style={{width:'100%',background:'white',border:'2px solid #e2e8f0',borderRadius:'16px',padding:'20px',display:'flex',alignItems:'center',gap:'16px',cursor:'pointer',transition:'all 0.2s',textAlign:'left'}}
            onMouseEnter={e=>{(e.currentTarget as any).style.borderColor='#93c5fd';(e.currentTarget as any).style.boxShadow='0 4px 16px rgba(37,99,235,0.1)'}}
            onMouseLeave={e=>{(e.currentTarget as any).style.borderColor='#e2e8f0';(e.currentTarget as any).style.boxShadow='none'}}>
            <div style={{width:'56px',height:'56px',borderRadius:'14px',background:'#eff6ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px',flexShrink:0}}>
              {child.avatar || '📚'}
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:'700',color:'#1e293b',fontSize:'17px'}}>{child.name}</div>
              <div style={{color:'#64748b',fontSize:'13px',marginTop:'2px'}}>{child.grade}</div>
            </div>
            <BookOpen size={20} color="#94a3b8"/>
          </button>
        ))}

        {!showAdd ? (
          <button onClick={() => setShowAdd(true)} style={{width:'100%',border:'2px dashed #cbd5e1',borderRadius:'16px',padding:'20px',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',color:'#64748b',cursor:'pointer',background:'transparent',fontSize:'14px',fontWeight:'500',transition:'all 0.2s'}}
            onMouseEnter={e=>{(e.currentTarget as any).style.borderColor='#93c5fd';(e.currentTarget as any).style.color='#2563eb'}}
            onMouseLeave={e=>{(e.currentTarget as any).style.borderColor='#cbd5e1';(e.currentTarget as any).style.color='#64748b'}}>
            <Plus size={18}/> 新增孩子
          </button>
        ) : (
          <div style={{background:'white',border:'2px solid #e2e8f0',borderRadius:'16px',padding:'20px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h3 style={{margin:0,fontSize:'16px',fontWeight:'700',color:'#1e293b'}}>新增孩子</h3>
              <button onClick={() => setShowAdd(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#94a3b8'}}><X size={18}/></button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              <input style={{width:'100%',background:'#f8fafc',border:'1.5px solid #e2e8f0',borderRadius:'10px',padding:'10px 14px',fontSize:'14px',color:'#1e293b',outline:'none',boxSizing:'border-box'}}
                placeholder="孩子姓名" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key==='Enter'&&addChild()} autoFocus
                onFocus={e=>(e.target as any).style.borderColor='#93c5fd'} onBlur={e=>(e.target as any).style.borderColor='#e2e8f0'}/>
              <select style={{width:'100%',background:'#f8fafc',border:'1.5px solid #e2e8f0',borderRadius:'10px',padding:'10px 14px',fontSize:'14px',color:'#1e293b',outline:'none'}}
                value={newGrade} onChange={e => setNewGrade(e.target.value)}>
                {GRADES.map(g=><option key={g}>{g}</option>)}
              </select>
              <div>
                <p style={{color:'#64748b',fontSize:'12px',marginBottom:'8px',margin:'0 0 8px'}}>選擇頭像</p>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  {EMOJIS.map(e=>(
                    <button key={e} onClick={() => setNewEmoji(e)} style={{width:'40px',height:'40px',borderRadius:'10px',fontSize:'20px',border:'2px solid',borderColor:newEmoji===e?'#2563eb':'#e2e8f0',background:newEmoji===e?'#eff6ff':'#f8fafc',cursor:'pointer',transition:'all 0.15s'}}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{display:'flex',gap:'8px',marginTop:'4px'}}>
                <button onClick={() => setShowAdd(false)} style={{flex:1,padding:'10px',borderRadius:'10px',border:'1.5px solid #e2e8f0',background:'white',color:'#64748b',fontSize:'14px',cursor:'pointer',fontWeight:'500'}}>取消</button>
                <button onClick={addChild} disabled={!newName.trim()} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',background:newName.trim()?'#2563eb':'#cbd5e1',color:'white',fontSize:'14px',cursor:newName.trim()?'pointer':'not-allowed',fontWeight:'600',transition:'all 0.15s'}}>新增</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <p style={{color:'#94a3b8',fontSize:'12px',marginTop:'48px'}}>目標：考上第一志願 🎯</p>
    </div>
  )
}
