'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { Flame, Heart, Bell, User, Film } from 'lucide-react'
import { getNotificationUnreadCount } from '@/lib/api'
import { supabase } from '@/lib/supabase/client'

const tabs = [
  { href: '/discover', icon: Flame, label: 'Découvrir' },
  { href: '/matches', icon: Heart, label: 'Matchs' },
  { href: '/stories', icon: Film, label: 'Stories' },
  { href: '/notifications', icon: Bell, label: 'Notifications' },
  { href: '/profile', icon: User, label: 'Profil' },
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | undefined
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      getNotificationUnreadCount().then(setUnreadCount).catch(() => {})
      channel = supabase.channel('notif-count')
      channel.on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => { getNotificationUnreadCount().then(setUnreadCount).catch(() => {}) })
      channel.subscribe()
    })()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  const isActive = (href: string) => pathname.startsWith(href)

  const prevPath = useRef(pathname)
  const [animKey, setAnimKey] = useState(0)
  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname
      setAnimKey(k => k + 1)
    }
  }, [pathname])

  return (
    <div className="flex-1 flex flex-col w-full min-h-screen relative">
      <motion.main
        key={animKey}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring' as const, stiffness: 300, damping: 30, mass: 0.8 }}
        className="flex-1 flex flex-col relative z-10"
        style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}
      >
        {children}
      </motion.main>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-20 w-full max-w-lg
        flex items-center justify-around border-t border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-2xl px-2 pb-2 pt-2
        shadow-[0_-8px_32px_rgba(0,0,0,0.5)] rounded-t-3xl"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))' }}>
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center gap-0.5 py-1.5 px-1 relative rounded-xl transition hover:bg-white/5">
              <div className="relative flex items-center justify-center h-6">
                <Icon size={22} className={active ? 'text-[#D92D4A] drop-shadow-[0_0_8px_rgba(217,45,74,0.5)]' : 'text-[#6B6258]'} />
                <AnimatePresence>
                  {active && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring' as const, stiffness: 500, damping: 25 }}
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#D92D4A] shadow-[0_0_6px_rgba(217,45,74,0.8)]"
                    />
                  )}
                </AnimatePresence>
                {href === '/notifications' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold text-white px-1"
                    style={{ background: '#D92D4A' }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </div>
              <span className={`text-[10px] font-medium tracking-wide ${active ? 'text-[#D92D4A]' : 'text-[#6B6258]'}`}>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
