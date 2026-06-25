'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, MessageCircle, Sparkles, BadgeCheck, ArrowLeft, Bell, type LucideIcon } from 'lucide-react'
import { getNotifications, markNotificationRead } from '@/lib/api'

interface Notification {
  id: string
  user_id: string
  actor_id: string
  type: string
  read: boolean
  created_at: string
  actor: { name: string; photos: string[] } | null
}

const iconMap: Record<string, LucideIcon> = {
  match: Heart,
  flirt: Sparkles,
  message: MessageCircle,
  super_like: Sparkles,
  verification: BadgeCheck,
}

const labelMap: Record<string, string> = {
  match: 'Nouveau match !',
  flirt: 'Quelqu\'un t\'a envoyé un clin d\'œil',
  message: 'Nouveau message',
  super_like: 'Super like reçu !',
  verification: 'Vérification de compte',
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    getNotifications().then(({ data }) => {
      if (data) setNotifications(data as Notification[])
    })
  }, [])

  const handleClick = async (n: Notification) => {
    if (!n.read) await markNotificationRead(n.id)
    if (n.type === 'message' || n.type === 'match') {
      router.push('/matches')
    } else {
      router.push('/profile')
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button onClick={() => router.back()} className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Notifications</h2>
      </header>
      <div className="flex-1 px-4 pb-8 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bell size={40} className="text-[#6B6258] mb-3" />
            <p className="text-[#9E9488] text-sm">Aucune notification</p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map(n => {
              const Icon = iconMap[n.type] || Bell
              return (
                <button key={n.id} onClick={() => handleClick(n)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition ${
                    n.read ? 'bg-transparent' : 'bg-[#D92D4A]/5'
                  }`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    n.read ? 'bg-[#1C1C1E]' : 'bg-[#D92D4A]/10'
                  }`}>
                    <Icon size={18} className={n.read ? 'text-[#6B6258]' : 'text-[#D92D4A]'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${n.read ? 'text-[#9E9488]' : 'text-white font-medium'}`}>
                      {labelMap[n.type] || 'Notification'}
                    </p>
                    <p className="text-xs text-[#6B6258] mt-0.5">
                      {new Date(n.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-[#D92D4A] shrink-0" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
