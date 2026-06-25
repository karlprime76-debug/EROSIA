'use client'

import { useEffect, useState } from 'react'
import { subscribeToPush } from '@/lib/push'
import { savePushSubscription, removePushSubscription } from '@/lib/api'

export function usePushNotifications() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.resolve().then(() => {
      if ('Notification' in window && 'serviceWorker' in navigator) {
        Notification.requestPermission().then(perm => {
          setEnabled(perm === 'granted')
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })
  }, [])

  const toggle = async () => {
    if (enabled) {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await removePushSubscription(sub.endpoint)
      }
      setEnabled(false)
    } else {
      const perm = await Notification.requestPermission()
      if (perm === 'granted') {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js')
          const sub = await subscribeToPush(reg)
          await savePushSubscription(sub.endpoint, sub.toJSON().keys!.p256dh!, sub.toJSON().keys!.auth!)
          setEnabled(true)
        } catch (e) {
          console.error('Failed to subscribe to push:', e)
        }
      }
    }
  }

  return { enabled, loading, toggle }
}
