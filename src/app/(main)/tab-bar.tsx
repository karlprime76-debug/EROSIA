'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { Compass, Heart, Bell, User, Film, Calendar } from 'lucide-react'
import { getNotificationUnreadCount } from '@/lib/api'
import { supabase } from '@/lib/supabase/client'
import { useLocale } from '@/lib/i18n'

const tabs = [
  { href: '/discover', icon: Compass, key: 'nav_discover' as const },
  { href: '/matches', icon: Heart, key: 'nav_matches' as const },
  { href: '/stories', icon: Film, key: 'nav_stories' as const },
  { href: '/notifications', icon: Bell, key: 'nav_notifications' as const },
  { href: '/dates', icon: Calendar, key: 'nav_dates' as const },
  { href: '/island', icon: User, key: 'nav_profile' as const },
]

export function ContentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isFullscreen = pathname.startsWith('/chat/')
  return (
    <div
      className="flex-1 flex flex-col relative z-10"
      style={isFullscreen ? { minHeight: 0, overflow: 'hidden' } : { paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
    >
      {children}
    </div>
  )
}

export function TabBar() {
  const pathname = usePathname()
  const { t } = useLocale()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | undefined
    const refreshCount = () => { getNotificationUnreadCount().then(setUnreadCount).catch(() => {}) }
    const onNotifRead = () => { setUnreadCount(prev => Math.max(0, prev - 1)) }
    window.addEventListener('notif-read', onNotifRead)
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      refreshCount()
      channel = supabase.channel('notif-count')
      channel.on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => { refreshCount() })
      channel.subscribe()
    })()
    return () => {
      if (channel) supabase.removeChannel(channel)
      window.removeEventListener('notif-read', onNotifRead)
    }
  }, [])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const hidden = pathname.startsWith('/chat/')

  if (hidden) return null

  return (
    <nav aria-label="Navigation principale"
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="absolute -top-10 inset-x-0 h-10 bg-gradient-to-t from-[var(--bg)]/90 to-transparent pointer-events-none" />

      <div
        className="relative mx-3 mb-3 rounded-[22px] overflow-hidden"
        style={{
          background: 'var(--glass-deep-bg)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-shadow)',
        }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

        <div className="flex items-center justify-around px-1 py-2">
          {tabs.map(({ href, icon: Icon, key }) => {
            const label = t(key)
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className="relative flex-1 flex flex-col items-center gap-1 py-2 rounded-xl group transition-all duration-200 active:scale-[0.93]"
              >
                <AnimatePresence>
                  {active && (
                    <motion.div
                      layoutId="nav-active-bg"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      className="absolute inset-x-2 inset-y-0 rounded-xl"
                      style={{ background: 'rgba(217,45,74,0.06)' }}
                    />
                  )}
                </AnimatePresence>

                <div className="relative z-10">
                  <Icon
                    size={21}
                    strokeWidth={active ? 2.2 : 1.8}
                    className={`transition-all duration-300 ${
                      active
                        ? 'text-[var(--primary)]'
                        : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
                    }`}
                    style={active ? { filter: 'drop-shadow(0 0 6px rgba(217,45,74,0.35))' } : {}}
                  />

                  {href === '/notifications' && unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] flex items-center justify-center rounded-full text-[8px] font-bold text-on-primary px-0.5 bg-[var(--primary)] shadow-[0_0_8px var(--primaryGlow)]"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </motion.span>
                  )}
                </div>

                <span
                  className={`relative z-10 text-[9px] font-semibold tracking-wider uppercase transition-colors duration-300 ${
                    active ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {label}
                </span>

                <AnimatePresence>
                  {active && (
                    <motion.div
                      layoutId="nav-active-dot"
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      exit={{ opacity: 0, scaleX: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[var(--primary)]"
                      style={{ boxShadow: '0 0 8px rgba(217,45,74,0.6)' }}
                    />
                  )}
                </AnimatePresence>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
