'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { Compass, Heart, Bell, User, Film, Globe } from 'lucide-react'
import { getNotificationUnreadCount } from '@/lib/api'
import { supabase } from '@/lib/supabase/client'

const tabs = [
  { href: '/discover', icon: Compass, label: 'Explorer' },
  { href: '/matches', icon: Heart, label: 'Matchs' },
  { href: '/stories', icon: Film, label: 'Stories' },
  { href: '/notifications', icon: Bell, label: 'Actus' },
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

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  // Pages qui doivent avoir du contenu en plein écran (pas de padding-bottom pour la nav)
  const isFullscreen = pathname.startsWith('/island') || pathname.startsWith('/chat/')

  return (
    <div className="flex-1 flex flex-col w-full min-h-screen relative bg-[var(--bg)]">
      <motion.main
        key={animKey}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 flex flex-col relative z-10"
        style={isFullscreen ? {} : { paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
      >
        {children}
      </motion.main>

      {/* Bottom navigation premium — masquée en mode fullscreen */}
      {!isFullscreen && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Dégradé de fondu au-dessus de la nav */}
          <div className="absolute -top-10 inset-x-0 h-10 bg-gradient-to-t from-[#070708]/90 to-transparent pointer-events-none" />

          <div
            className="relative mx-3 mb-3 rounded-[22px] overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(20,20,22,0.92) 0%, rgba(12,12,14,0.96) 100%)',
              backdropFilter: 'blur(32px) saturate(1.3)',
              WebkitBackdropFilter: 'blur(32px) saturate(1.3)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 -1px 0 rgba(255,255,255,0.04) inset, 0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            {/* Lueur active de la nav */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

            <div className="flex items-center justify-around px-1 py-2">
              {tabs.map(({ href, icon: Icon, label }) => {
                const active = isActive(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className="relative flex-1 flex flex-col items-center gap-1 py-2 rounded-xl group transition-all duration-200 active:scale-[0.93]"
                  >
                    {/* Fond actif */}
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

                    {/* Icône + badge */}
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

                      {/* Badge notifications */}
                      {href === '/notifications' && unreadCount > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] flex items-center justify-center rounded-full text-[8px] font-bold text-white px-0.5 bg-[var(--primary)] shadow-[0_0_8px_rgba(217,45,74,0.5)]"
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </motion.span>
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className={`relative z-10 text-[9px] font-semibold tracking-wider uppercase transition-colors duration-300 ${
                        active ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      {label}
                    </span>

                    {/* Indicateur point actif */}
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

              {/* Bouton 3D Island — pill spécial */}
              <Link
                href="/island"
                className={`relative flex-1 flex flex-col items-center gap-1 py-2 rounded-xl group transition-all duration-200 active:scale-[0.93] ${
                  isActive('/island') ? '' : ''
                }`}
              >
                <AnimatePresence>
                  {isActive('/island') && (
                    <motion.div
                      layoutId="nav-active-bg"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      className="absolute inset-x-2 inset-y-0 rounded-xl"
                      style={{ background: 'rgba(124,138,232,0.08)' }}
                    />
                  )}
                </AnimatePresence>
                <div className="relative z-10">
                  <Globe
                    size={21}
                    strokeWidth={isActive('/island') ? 2.2 : 1.8}
                    className={`transition-all duration-300 ${
                      isActive('/island')
                        ? 'text-[var(--accent-cool)]'
                        : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
                    }`}
                    style={isActive('/island') ? { filter: 'drop-shadow(0 0 6px rgba(124,138,232,0.4))' } : {}}
                  />
                </div>
                <span
                  className={`relative z-10 text-[9px] font-semibold tracking-wider uppercase transition-colors duration-300 ${
                    isActive('/island') ? 'text-[var(--accent-cool)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
                  }`}
                >
                  3D
                </span>
                <AnimatePresence>
                  {isActive('/island') && (
                    <motion.div
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      exit={{ opacity: 0, scaleX: 0 }}
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[var(--accent-cool)]"
                      style={{ boxShadow: '0 0 8px rgba(124,138,232,0.6)' }}
                    />
                  )}
                </AnimatePresence>
              </Link>
            </div>
          </div>
        </nav>
      )}
    </div>
  )
}
