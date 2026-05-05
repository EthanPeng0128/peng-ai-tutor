'use client'
import { useEffect, useState } from 'react'

export default function DebugPage() {
  const [info, setInfo] = useState<any>({})

  useEffect(() => {
    const ua = navigator.userAgent
    const isIPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document)
    const isPhone = /iPhone|iPod|Android/i.test(ua) && !isIPad
    setInfo({
      userAgent: ua,
      iPadMatch: /iPad/.test(ua),
      MacintoshMatch: /Macintosh/.test(ua),
      ontouchend: 'ontouchend' in document,
      isIPad,
      isPhone,
      result: isPhone ? '👉 用 Google Docs Viewer' : '👉 用原生 PDF Viewer',
    })
  }, [])

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', fontSize: 14, lineHeight: 1.8 }}>
      <h2>裝置診斷</h2>
      <div style={{ background: '#f1f5f9', padding: 12, borderRadius: 8, marginTop: 12 }}>
        <div><b>User Agent:</b></div>
        <div style={{ wordBreak: 'break-all', fontSize: 12 }}>{info.userAgent}</div>
      </div>
      <div style={{ marginTop: 16 }}>
        <div>iPad regex 命中: <b>{String(info.iPadMatch)}</b></div>
        <div>Macintosh regex 命中: <b>{String(info.MacintoshMatch)}</b></div>
        <div>ontouchend 存在: <b>{String(info.ontouchend)}</b></div>
        <div>=&gt; isIPad: <b style={{ color: info.isIPad ? 'green' : 'red' }}>{String(info.isIPad)}</b></div>
        <div>=&gt; isPhone: <b style={{ color: info.isPhone ? 'red' : 'green' }}>{String(info.isPhone)}</b></div>
      </div>
      <div style={{ marginTop: 20, padding: 12, background: '#dbeafe', borderRadius: 8, fontSize: 16, fontWeight: 700 }}>
        {info.result}
      </div>
    </div>
  )
}
