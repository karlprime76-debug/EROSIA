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
  const prevPath = useRef(pathname)
  const [animKey, setAnimKey] = useState(0)

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

  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname
      setAnimKey(k => k + 1)
    }
  }, [pathname])

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <div className="flex-1 flex flex-col w-full min-h-screen relative bg-[var(--bg)]">
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

      {/* Premium glass bottom navigation */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-32px)] max-w-sm
        flex items-center justify-around px-2 py-1.5 rounded-2xl
        glass-nav
        shadow-[0_8px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]
        backdrop-blur-2xl"
        style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom, 6px))' }}>
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 relative group">
              <div className="relative flex items-center justify-center h-6 w-10">
                <div className="relative">
                  <Icon
                    size={20}
                    className={`transition-all duration-300 ${
                      active
                        ? 'text-[var(--primary)] drop-shadow-[0_0_6px_rgba(217,45,74,0.4)]'
                        : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
                    }`}
                  />
                  {/* Active indicator dot */}
                  <AnimatePresence>
                    {active && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_rgba(217,45,74,0.6)]"
                      />
                    )}
                  </AnimatePresence>
                </div>
                {/* Notification badge */}
                {href === '/notifications' && unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-2 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold text-white px-1
                      bg-[var(--primary)] shadow-[0_0_8px_rgba(217,45,74,0.5)]"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </motion.span>
                )}
              </div>
              <span className={`text-[9px] font-medium tracking-wider uppercase transition-colors duration-300 ${
                active ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'
              }`}>
                {label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
