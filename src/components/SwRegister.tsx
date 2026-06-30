'use client'

import { useEffect } from 'react'

export default function SwRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const register = async () => {
      const reg = await navigator.serviceWorker.register('/sw.js')

      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' })
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload()
        })
        return
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' })
            navigator.serviceWorker.addEventListener('controllerchange', () => {
              window.location.reload()
            })
          }
        })
      })
    }

    register().catch(() => {})
  }, [])

  return null
}
