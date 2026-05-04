'use client'
import { useEffect, useState } from 'react'
import { X, Download } from 'lucide-react'

export default function PWAInstallPrompt() {
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    const ios = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    const dismissed = localStorage.getItem('pwa-dismissed')

    setIsIOS(ios)

    if (!standalone && !dismissed) {
      if (ios) {
        setTimeout(() => setShow(true), 3000)
      } else {
        window.addEventListener('beforeinstallprompt', (e: any) => {
          e.preventDefault()
          setDeferredPrompt(e)
          setTimeout(() => setShow(true), 3000)
        })
      }
    }
  }, [])

  function dismiss() {
    setShow(false)
    localStorage.setItem('pwa-dismissed', '1')
  }

  async function install() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const result = await deferredPrompt.userChoice
      if (result.outcome === 'accepted') setShow(false)
    }
  }

  if (!show) return null

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-in">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-2xl max-w-lg mx-auto">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 text-xl">🏠</div>
          <div className="flex-1">
            <p className="font-semibold text-white text-sm">加入主畫面</p>
            {isIOS ? (
              <p className="text-slate-400 text-xs mt-1">
                點底部的 <span className="text-blue-400">分享</span> → <span className="text-blue-400">加入主畫面</span>，像 App 一樣使用！
              </p>
            ) : (
              <p className="text-slate-400 text-xs mt-1">安裝到主畫面，快速啟動！</p>
            )}
          </div>
          <button onClick={dismiss} className="text-slate-500 hover:text-slate-300 p-1">
            <X size={16} />
          </button>
        </div>
        {!isIOS && deferredPrompt && (
          <button onClick={install}
            className="mt-3 w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2 rounded-xl flex items-center justify-center gap-2 transition-colors">
            <Download size={14} /> 安裝到主畫面
          </button>
        )}
      </div>
    </div>
  )
}
