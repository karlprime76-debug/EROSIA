'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, MessageCircle, Sparkles, BadgeCheck, ArrowLeft, Bell, type LucideIcon } from 'lucide-react'
import { getNotifications, markNotificationRead } from '@/lib/api'
import { useToast } from '@/components/Toast'

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
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getNotifications().then(({ data }) => {
      if (data) setNotifications(data as Notification[])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleClick = async (n: Notification) => {
    try {
      if (!n.read) await markNotificationRead(n.id)
      if (n.type === 'match') {
        router.push('/matches')
      } else if (n.type === 'message') {
        router.push(`/chat/${n.actor_id}`)
      } else {
        router.push('/profile')
      }
    } catch { toast('Erreur', 'error') }
  }

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <h1 className="sr-only">Notifications</h1>
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.push('/matches')} aria-label="Retour" className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Notifications</h2>
      </header>
      <div className="flex-1 px-4 pb-8 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} /></div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-up">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--primary)]/10 to-transparent mx-auto mb-5 flex items-center justify-center border border-[var(--primary)]/10">
              <Bell size={36} className="text-[var(--primary)]/40" />
            </div>
            <p className="text-lg font-semibold">Aucune notification</p>
            <p className="text-[var(--textSecondary)] text-sm mt-1 max-w-xs leading-relaxed">Les matchs, messages et activités apparaîtront ici.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map(n => {
              const Icon = iconMap[n.type] || Bell
              return (
                <button type="button" key={n.id} onClick={() => handleClick(n)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition ${
                    n.read ? 'bg-transparent' : 'bg-[var(--primary)]/5'
                  }`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    n.read ? 'bg-[var(--card)]' : 'bg-[var(--primary)]/10'
                  }`}>
                    <Icon size={18} className={n.read ? 'text-[var(--textSecondary)]' : 'text-[var(--primary)]'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${n.read ? 'text-[var(--textSecondary)]' : 'text-[var(--textPrimary)] font-medium'}`}>
                      {labelMap[n.type] || 'Notification'}
                    </p>
                    <p className="text-xs text-[var(--textSecondary)] mt-0.5">
                      {new Date(n.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-[var(--primary)] shrink-0" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
