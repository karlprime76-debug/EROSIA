'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Flame, Heart, Film, MoreHorizontal, Bell, Gift, User, Settings, CalendarHeart } from 'lucide-react'
import { getNotificationUnreadCount } from '@/lib/api'
import { supabase } from '@/lib/supabase/client'


const mainTabs = [
  { href: '/discover', icon: Flame, label: 'Découvrir' },
  { href: '/matches', icon: Heart, label: 'Matchs' },
  { href: '/stories', icon: Film, label: 'Stories' },
]

const extraTabs = [
  { href: '/events', icon: CalendarHeart, label: 'Antennes' },
  { href: '/gifts', icon: Gift, label: 'Boutique' },
  { href: '/notifications', icon: Bell, label: 'Notifs' },
  { href: '/profile', icon: User, label: 'Profil' },
  { href: '/settings', icon: Settings, label: 'Réglages' },
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)
  const [showMenu, setShowMenu] = useState(false)

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

  const isActive = (href: string) => {
    if (href === '/profile') return pathname === '/profile'
    return pathname.startsWith(href)
  }

  return (
    <div className="flex-1 flex flex-col w-full min-h-screen relative">
      <main className="flex-1 flex flex-col relative z-10" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>{children}</main>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-20 w-full max-w-lg
        flex items-center justify-between gap-1 border-t border-white/5 bg-black/40 backdrop-blur-2xl px-3 pb-3 pt-2
        shadow-[0_-8px_32px_rgba(0,0,0,0.5)] rounded-t-3xl"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}>
        {mainTabs.map(({ href, icon: Icon, label }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center gap-1 py-1.5 px-1 relative rounded-xl transition hover:bg-white/5">
              <div className="relative flex items-center justify-center h-7">
                <Icon size={24} className={active ? 'text-[#D92D4A] drop-shadow-[0_0_8px_rgba(217,45,74,0.5)]' : 'text-[#6B6258]'} />
                {active && <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#D92D4A] shadow-[0_0_6px_rgba(217,45,74,0.8)]" />}
              </div>
              <span className={`text-[10px] font-medium tracking-wide ${active ? 'text-[#D92D4A]' : 'text-[#6B6258]'}`}>{label}</span>
            </Link>
          )
        })}

        <button onClick={() => setShowMenu(!showMenu)}
          className="flex-1 flex flex-col items-center gap-1 py-1.5 px-1 relative rounded-xl transition hover:bg-white/5">
          <div className="relative flex items-center justify-center h-7">
            <MoreHorizontal size={24} className={showMenu ? 'text-[#D92D4A]' : 'text-[#6B6258]'} />
          </div>
          <span className={`text-[10px] font-medium tracking-wide ${showMenu ? 'text-[#D92D4A]' : 'text-[#6B6258]'}`}>Plus</span>
        </button>
      </nav>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-xs glass-card rounded-2xl p-3 shadow-2xl animate-scale-in">
            <div className="grid grid-cols-2 gap-2">
              {extraTabs.map(({ href, icon: Icon, label }) => {
                const active = isActive(href)
                return (
                  <Link key={href} href={href} onClick={() => setShowMenu(false)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition ${active ? 'bg-[#D92D4A]/10 text-[#D92D4A]' : 'hover:bg-white/5 text-[#9E9488]'}`}>
                    <Icon size={22} className={active ? 'text-[#D92D4A]' : ''} />
                    <span className="text-xs font-medium">{label}</span>
                    {href === '/notifications' && unreadCount > 0 && (
                      <span className="min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold text-white px-1"
                        style={{ background: '#D92D4A' }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
