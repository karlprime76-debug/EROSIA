'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export function SplashClient() {
  const router = useRouter()
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true

    const isMobile = window.innerWidth < 640 || 'ontouchstart' in window
    const splashDuration = isMobile ? 1200 : 2200
    const maxWait = 5000

    const timeouts: ReturnType<typeof setTimeout>[] = []

    const timer = setTimeout(() => {
      const fallbackTimer = setTimeout(() => {
        router.replace('/welcome')
      }, maxWait)
      timeouts.push(fallbackTimer)

      supabase.auth.getUser().then(({ data: { user } }) => {
        clearTimeout(fallbackTimer)
        router.replace(user ? '/discover' : '/welcome')
      }).catch(() => {
        clearTimeout(fallbackTimer)
        router.replace('/welcome')
      })
    }, splashDuration)
    timeouts.push(timer)

    return () => { timeouts.forEach(clearTimeout) }
  }, [router])

  return null
}
