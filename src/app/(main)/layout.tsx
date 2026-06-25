'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Flame, Heart, Bell, User, Settings } from 'lucide-react'
import { getNotificationUnreadCount } from '@/lib/api'
import { supabase } from '@/lib/supabase/client'


const tabs = [
  { href: '/discover', icon: Flame, label: 'Découvrir' },
  { href: '/matches', icon: Heart, label: 'Matchs' },
  { href: '/notifications', icon: Bell, label: 'Notifs' },
  { href: '/profile', icon: User, label: 'Profil' },
  { href: '/settings', icon: Settings, label: 'Réglages' },
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | undefined
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      getNotificationUnreadCount().then(setUnreadCount)
      channel = supabase.channel('notif-count')
      channel.on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => { getNotificationUnreadCount().then(setUnreadCount) })
      channel.subscribe()
    })()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="flex-1 flex flex-col w-full min-h-screen relative">
      <main className="flex-1 flex flex-col relative z-10 pb-20">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-lg left-1/2 -translate-x-1/2
        flex border-t border-white/5 bg-black/40 backdrop-blur-2xl px-4 pb-3 pt-2
        shadow-[0_-8px_32px_rgba(0,0,0,0.5)] rounded-t-3xl"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}>
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center gap-0.5 py-1 relative">
              <div className="relative">
                <Icon size={22} className={active ? 'text-[#D92D4A] drop-shadow-[0_0_8px_rgba(217,45,74,0.5)]' : 'text-[#6B6258]'} />
                {active && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#D92D4A] shadow-[0_0_6px_rgba(217,45,74,0.8)]" />}
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-[#D92D4A]' : 'text-[#6B6258]'}`}>{label}</span>
              {href === '/notifications' && unreadCount > 0 && (
                <span className="absolute -top-0.5 right-1/2 translate-x-3 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
                  style={{ background: '#D92D4A' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
