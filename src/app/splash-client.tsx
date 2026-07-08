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

    const timer = setTimeout(() => {
      const timeoutId = setTimeout(() => {
        router.replace('/welcome')
      }, maxWait)

      supabase.auth.getUser().then(({ data: { user } }) => {
        clearTimeout(timeoutId)
        router.replace(user ? '/discover' : '/welcome')
      }).catch(() => {
        clearTimeout(timeoutId)
        router.replace('/welcome')
      })
    }, splashDuration)

    return () => clearTimeout(timer)
  }, [router])

  return null
}
