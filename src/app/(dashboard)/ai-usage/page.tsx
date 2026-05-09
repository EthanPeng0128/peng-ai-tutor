'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

const API_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  'multi-summary': { label: '大範圍整理', emoji: '📊', color: '#a78bfa' },
  'summary-sheet': { label: '單課重點圖', emoji: '📋', color: '#fb923c' },
  'quiz': { label: '出題複習', emoji: '✏️', color: '#34d399' },
  'exam-analysis': { label: '考卷分析', emoji: '📷', color: '#f0b429' },
  'parse-textbook': { label: '辨識課本', emoji: '📖', color: '#4f7ef5' },
  'chat': { label: 'AI 家教對話', emoji: '💬', color: '#ec4899' },
}

const USD_TO_TWD = 32  // 約略匯率

export default function AIUsagePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [usage, setUsage] = useState<any[]>([])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase.from('ai_usage').select('*').order('created_at', { ascending: false }).limit(2000)
    setUsage(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  // 統計計算
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const allTotal = usage.reduce((acc, u) => ({
    calls: acc.calls + 1,
    inputTokens: acc.inputTokens + (u.input_tokens || 0),
    outputTokens: acc.outputTokens + (u.output_tokens || 0),
    cost: acc.cost + Number(u.cost_usd || 0),
  }), { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 })

  const monthTotal = usage.filter(u => new Date(u.created_at) >= monthStart).reduce((acc, u) => ({
    calls: acc.calls + 1,
    cost: acc.cost + Number(u.cost_usd || 0),
  }), { calls: 0, cost: 0 })

  const weekTotal = usage.filter(u => new Date(u.created_at) >= weekStart).reduce((acc, u) => ({
    calls: acc.calls + 1,
    cost: acc.cost + Number(u.cost_usd || 0),
  }), { calls: 0, cost: 0 })

  const todayTotal = usage.filter(u => new Date(u.created_at) >= todayStart).reduce((acc, u) => ({
    calls: acc.calls + 1,
    cost: acc.cost + Number(u.cost_usd || 0),
  }), { calls: 0, cost: 0 })

  // 各 API 統計
  const apiStats: Record<string, { calls: number; cost: number; tokens: number }> = {}
  usage.forEach(u => {
    if (!apiStats[u.api_name]) apiStats[u.api_name] = { calls: 0, cost: 0, tokens: 0 }
    apiStats[u.api_name].calls += 1
    apiStats[u.api_name].cost += Number(u.cost_usd || 0)
    apiStats[u.api_name].tokens += (u.input_tokens || 0) + (u.output_tokens || 0)
  })

  const sortedApis = Object.entries(apiStats).sort((a, b) => b[1].cost - a[1].cost)

  const containerStyle = { padding: '16px', maxWidth: '720px', margin: '0 auto', paddingBottom: '80px' }
  const cardStyle = { background: 'white', borderRadius: '14px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <button onClick={() => router.back()} style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <ArrowLeft size={20} color="#475569"/>
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#1e293b', flex: 1 }}>💰 AI 用量儀表板</h1>
        <button onClick={loadData} disabled={loading} style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <RefreshCw size={18} color="#475569" style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}/>
        </button>
      </div>

      {loading ? (
        <div style={{ ...cardStyle, padding: '32px', textAlign: 'center', color: '#94a3b8' }}>載入中...</div>
      ) : (
        <>
          {/* 總覽 4 個指標 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
            <div style={{ ...cardStyle, marginBottom: 0, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', margin: '0 0 4px' }}>📅 今天</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: 'white', margin: '0 0 2px' }}>${todayTotal.cost.toFixed(3)}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', margin: 0 }}>{todayTotal.calls} 次 · 約 NT${(todayTotal.cost * USD_TO_TWD).toFixed(1)}</p>
            </div>
            <div style={{ ...cardStyle, marginBottom: 0, background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', margin: '0 0 4px' }}>📆 本週</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: 'white', margin: '0 0 2px' }}>${weekTotal.cost.toFixed(2)}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', margin: 0 }}>{weekTotal.calls} 次 · 約 NT${(weekTotal.cost * USD_TO_TWD).toFixed(0)}</p>
            </div>
            <div style={{ ...cardStyle, marginBottom: 0, background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', margin: '0 0 4px' }}>📊 本月</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: 'white', margin: '0 0 2px' }}>${monthTotal.cost.toFixed(2)}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', margin: 0 }}>{monthTotal.calls} 次 · 約 NT${(monthTotal.cost * USD_TO_TWD).toFixed(0)}</p>
            </div>
            <div style={{ ...cardStyle, marginBottom: 0, background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', margin: '0 0 4px' }}>♾️ 累計</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: 'white', margin: '0 0 2px' }}>${allTotal.cost.toFixed(2)}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', margin: 0 }}>{allTotal.calls} 次 · 約 NT${(allTotal.cost * USD_TO_TWD).toFixed(0)}</p>
            </div>
          </div>

          {/* Token 用量 */}
          <div style={cardStyle}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', margin: '0 0 10px' }}>🎯 Token 用量（累計）</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, padding: '12px', background: '#f8fafc', borderRadius: '10px' }}>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 2px' }}>輸入 Tokens</p>
                <p style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>{allTotal.inputTokens.toLocaleString()}</p>
              </div>
              <div style={{ flex: 1, padding: '12px', background: '#f8fafc', borderRadius: '10px' }}>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 2px' }}>輸出 Tokens</p>
                <p style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>{allTotal.outputTokens.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* 各 API 統計 */}
          <div style={cardStyle}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', margin: '0 0 12px' }}>📊 各功能用量分布</p>
            {sortedApis.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '20px' }}>還沒有資料，使用 AI 後就會出現！</p>
            ) : (
              sortedApis.map(([name, stat]) => {
                const meta = API_LABELS[name] || { label: name, emoji: '🤖', color: '#94a3b8' }
                const pct = allTotal.cost > 0 ? (stat.cost / allTotal.cost * 100) : 0
                return (
                  <div key={name} style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                        {meta.emoji} {meta.label}
                      </p>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: meta.color, margin: 0 }}>
                        ${stat.cost.toFixed(3)}
                      </p>
                    </div>
                    <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginBottom: '4px' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: meta.color, transition: 'width 0.3s' }}/>
                    </div>
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
                      {stat.calls} 次 · {stat.tokens.toLocaleString()} tokens · {pct.toFixed(0)}%
                    </p>
                  </div>
                )
              })
            )}
          </div>

          {/* 最近呼叫 */}
          <div style={cardStyle}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', margin: '0 0 10px' }}>🕒 最近 10 次呼叫</p>
            {usage.slice(0, 10).map((u, i) => {
              const meta = API_LABELS[u.api_name] || { label: u.api_name, emoji: '🤖', color: '#94a3b8' }
              return (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: i < 9 ? '1px solid #f1f5f9' : 'none' }}>
                  <span style={{ fontSize: '16px' }}>{meta.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', margin: 0 }}>{meta.label}</p>
                    <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0 }}>
                      {new Date(u.created_at).toLocaleString('zh-TW', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })}
                       · {((u.input_tokens || 0) + (u.output_tokens || 0)).toLocaleString()} tokens
                    </p>
                  </div>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: meta.color, margin: 0 }}>${Number(u.cost_usd || 0).toFixed(3)}</p>
                </div>
              )
            })}
          </div>

          {/* 提示 */}
          <div style={{ ...cardStyle, background: '#fffbeb', border: '1px solid #fef3c7' }}>
            <p style={{ fontSize: '12px', color: '#854f0b', margin: 0, lineHeight: 1.6 }}>
              💡 此處統計只記錄已使用量。要查預付餘額請去 <a href="https://console.anthropic.com" target="_blank" style={{ color: '#854f0b', fontWeight: 700 }}>Anthropic Console →</a>
            </p>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
