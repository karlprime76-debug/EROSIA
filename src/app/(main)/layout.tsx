'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Flame, Heart, Bell, User, Settings } from 'lucide-react'
import { getUnreadCount } from '@/lib/api'
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
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      getUnreadCount().then(setUnreadCount)
      const channel = supabase.channel('notif-count')
      channel.on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => { getUnreadCount().then(setUnreadCount) })
      channel.subscribe()
      return () => { supabase.removeChannel(channel) }
    })()
  }, [])

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full bg-[#141414] shadow-sm relative">
      <main className="flex-1 flex flex-col">{children}</main>
      <nav className="flex border-t border-[#2A2826] bg-[#141414] px-4 pb-3 pt-2 z-10" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}>
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center gap-0.5 py-1 relative">
              <Icon size={24} className={active ? 'text-[#D92D4A]' : 'text-[#6B6258]'} />
              <span className={`text-xs font-medium ${active ? 'text-[#D92D4A]' : 'text-[#6B6258]'}`}>{label}</span>
              {href === '/notifications' && unreadCount > 0 && (
                <span className="absolute top-0 right-1/2 translate-x-3 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
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
