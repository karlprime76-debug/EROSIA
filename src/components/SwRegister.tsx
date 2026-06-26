'use client'

import { useEffect, useState, useCallback } from 'react'

export default function SwRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const register = async () => {
      const reg = await navigator.serviceWorker.register('/sw.js')

      if (reg.waiting) {
        setWaitingWorker(reg.waiting)
        return
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker)
          }
        })
      })
    }

    register().catch(() => {})
  }, [])

  const handleRefresh = useCallback(() => {
    if (!waitingWorker) return
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })
  }, [waitingWorker])

  if (!waitingWorker) return null

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#D92D4A] text-white px-4 py-3 rounded-xl shadow-lg">
      <span className="text-sm font-medium">Mise à jour disponible</span>
      <button
        onClick={handleRefresh}
        className="bg-white text-[#D92D4A] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-white/90 transition-colors"
      >
        Rafraîchir
      </button>
    </div>
  )
}
