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
  { href: '/notifications', icon: Bell, label: 'Acti' },
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
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
        className="flex-1 flex flex-col relative z-10"
        style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
      >
        {children}
      </motion.main>
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-32px)] max-w-sm
        flex items-center justify-around px-3 py-2 rounded-2xl
        bg-[rgba(15,15,17,0.85)] backdrop-blur-2xl
        border border-[rgba(255,255,255,0.06)]
        shadow-[0_8px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04)]"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))' }}>
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 relative">
              <div className="relative flex items-center justify-center h-6 w-10">
                <Icon size={20} className={active ? 'text-[#D92D4A]' : 'text-[#6B6560]'} />
                <AnimatePresence>
                  {active && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-[#D92D4A] shadow-[0_0_8px_rgba(217,45,74,0.6)]"
                    />
                  )}
                </AnimatePresence>
                {href === '/notifications' && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold text-white px-1"
                    style={{ background: '#D92D4A', boxShadow: '0 0 8px rgba(217,45,74,0.5)' }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </div>
              <span className={`text-[9px] font-medium tracking-wider uppercase ${active ? 'text-[#D92D4A]' : 'text-[#6B6560]'}`}>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
