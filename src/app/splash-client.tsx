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
    const timer = setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        router.replace(user ? '/discover' : '/welcome')
      } catch {
        router.replace('/welcome')
      }
    }, isMobile ? 1200 : 2200)

    return () => clearTimeout(timer)
  }, [router])

  return null
}
