'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, MessageCircle, Sparkles, BadgeCheck, ArrowLeft, Bell, Gift, Star, CalendarDays, Trophy, UserPlus, Film, type LucideIcon } from 'lucide-react'
import { getNotifications, markNotificationRead } from '@/lib/api'
import { useToast } from '@/components/Toast'

interface Notification {
  id: string
  user_id: string
  actor_id: string
  type: string
  read: boolean
  read_at?: string | null
  created_at: string
  metadata?: Record<string, string>
  actor: { name: string; photos: string[] } | null
}

const iconMap: Record<string, LucideIcon> = {
  like: Heart,
  super_like: Star,
  match: Heart,
  flirt: Sparkles,
  message: MessageCircle,
  story_reply: Film,
  date_proposal: CalendarDays,
  date_accepted: CalendarDays,
  date_reminder: CalendarDays,
  date_cancelled: CalendarDays,
  gift: Gift,
  visit: UserPlus,
  level_up: Trophy,
  achievement: Trophy,
  verification: BadgeCheck,
}

const labelMap: Record<string, string> = {
  like: 'Quelqu\'un t\'a liké',
  super_like: 'Super like reçu !',
  match: 'Nouveau match !',
  flirt: 'Clin d\'œil reçu',
  message: 'Nouveau message',
  story_reply: 'Réponse à ta story',
  date_proposal: 'Proposition de rendez-vous',
  date_accepted: 'Rendez-vous accepté !',
  date_reminder: 'Rappel : rendez-vous bientôt',
  date_cancelled: 'Rendez-vous annulé',
  gift: 'Cadeau reçu !',
  visit: 'Quelqu\'un a visité ton profil',
  level_up: 'Niveau supérieur !',
  achievement: 'Succès débloqué !',
  verification: 'Compte vérifié',
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
      if (!n.read) {
        await markNotificationRead(n.id)
        window.dispatchEvent(new CustomEvent('notif-read'))
      }
      const url = n.metadata?.action_url
      if (url && (url.startsWith('/') || url.startsWith(window.location.origin))) { router.push(url); return }
      switch (n.type) {
        case 'match':
        case 'message':
          router.push(n.metadata?.match_id ? `/chat/${n.metadata.match_id}` : '/matches')
          break
        case 'flirt':
        case 'super_like':
        case 'like':
        case 'visit':
          router.push(n.metadata?.profile_id ? `/profile/${n.metadata.profile_id}` : '/matches')
          break
        case 'story_reply':
          router.push('/stories')
          break
        case 'date_proposal':
        case 'date_accepted':
        case 'date_reminder':
        case 'date_cancelled':
          router.push('/dates')
          break
        case 'gift':
          router.push('/island')
          break
        case 'level_up':
        case 'achievement':
          router.push('/stats')
          break
        case 'verification':
          router.push('/verify')
          break
        default:
          router.push('/island')
      }
    } catch { toast('Erreur', 'error') }
  }

  const markAllRead = async () => {
    try {
      await Promise.all(notifications.filter(n => !n.read).map(n => markNotificationRead(n.id)))
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      window.dispatchEvent(new CustomEvent('notif-read'))
      toast('Tout marqué comme lu')
    } catch { toast('Erreur', 'error') }
  }

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <h1 className="sr-only">Notifications</h1>
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.push('/matches')} aria-label="Retour" className="p-2.5 rounded-xl"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold flex-1">Notifications</h2>
        {notifications.some(n => !n.read) && (
          <button type="button" onClick={markAllRead} className="text-xs text-primary hover:underline px-3 py-1.5 rounded-lg border border-primary/20">
            Tout marquer lu
          </button>
        )}
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
