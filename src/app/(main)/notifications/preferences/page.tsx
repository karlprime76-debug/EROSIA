'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, Mail, Volume2, Vibrate, Moon, Heart, MessageCircle, Star, Film, CalendarDays, Gift, Trophy, Megaphone, Sparkles, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'
import { logger } from '@/lib/logger'
import ToggleSwitch from '@/components/ToggleSwitch'

interface NotifPrefs {
  push_enabled: boolean
  email_enabled: boolean
  sound_enabled: boolean
  vibration_enabled: boolean
  new_match: boolean
  new_message: boolean
  new_like: boolean
  super_like: boolean
  story_reply: boolean
  date_proposal: boolean
  date_reminder: boolean
  gift_received: boolean
  event_invite: boolean
  promo: boolean
  level_up: boolean
  achievement: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
}

const defaultPrefs: NotifPrefs = {
  push_enabled: true,
  email_enabled: true,
  sound_enabled: true,
  vibration_enabled: true,
  new_match: true,
  new_message: true,
  new_like: true,
  super_like: true,
  story_reply: true,
  date_proposal: true,
  date_reminder: true,
  gift_received: true,
  event_invite: true,
  promo: true,
  level_up: true,
  achievement: true,
  quiet_hours_start: null,
  quiet_hours_end: null,
}

const channelItems: { key: keyof NotifPrefs; label: string; desc: string; icon: typeof Bell }[] = [
  { key: 'push_enabled', label: 'Notifications push', desc: 'Reçois des alertes sur ton téléphone', icon: Bell },
  { key: 'email_enabled', label: 'Notifications email', desc: 'Reçois des résumés par email', icon: Mail },
  { key: 'sound_enabled', label: 'Son', desc: 'Joue un son à la réception', icon: Volume2 },
  { key: 'vibration_enabled', label: 'Vibration', desc: 'Vibre à la réception', icon: Vibrate },
]

const notifTypes: { key: keyof NotifPrefs; label: string; icon: typeof Heart }[] = [
  { key: 'new_match', label: 'Nouveau match', icon: Heart },
  { key: 'new_message', label: 'Nouveau message', icon: MessageCircle },
  { key: 'new_like', label: 'Nouveau like', icon: Star },
  { key: 'super_like', label: 'Super like', icon: Sparkles },
  { key: 'story_reply', label: 'Réponse à une story', icon: Film },
  { key: 'date_proposal', label: 'Proposition de date', icon: CalendarDays },
  { key: 'date_reminder', label: 'Rappel de date', icon: Clock },
  { key: 'gift_received', label: 'Cadeau reçu', icon: Gift },
  { key: 'event_invite', label: 'Invitation événement', icon: CalendarDays },
  { key: 'promo', label: 'Promotions', icon: Megaphone },
  { key: 'level_up', label: 'Niveau supérieur', icon: Trophy },
  { key: 'achievement', label: 'Accomplissement', icon: Trophy },
]

export default function NotificationPreferencesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [prefs, setPrefs] = useState<NotifPrefs>(defaultPrefs)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (data) {
        setPrefs({
          push_enabled: data.push_enabled ?? true,
          email_enabled: data.email_enabled ?? true,
          sound_enabled: data.sound_enabled ?? true,
          vibration_enabled: data.vibration_enabled ?? true,
          new_match: data.new_match ?? true,
          new_message: data.new_message ?? true,
          new_like: data.new_like ?? true,
          super_like: data.super_like ?? true,
          story_reply: data.story_reply ?? true,
          date_proposal: data.date_proposal ?? true,
          date_reminder: data.date_reminder ?? true,
          gift_received: data.gift_received ?? true,
          event_invite: data.event_invite ?? true,
          promo: data.promo ?? true,
          level_up: data.level_up ?? true,
          achievement: data.achievement ?? true,
          quiet_hours_start: data.quiet_hours_start ?? null,
          quiet_hours_end: data.quiet_hours_end ?? null,
        })
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('notif_push, notif_email')
          .eq('id', user.id)
          .maybeSingle()
        if (profile) {
          setPrefs(prev => ({
            ...prev,
            push_enabled: profile.notif_push ?? true,
            email_enabled: profile.notif_email ?? true,
          }))
        }
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const savePref = async (patch: Partial<NotifPrefs>) => {
    if (!userId) return
    const prev = prefs
    setPrefs(prev => ({ ...prev, ...patch }))
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({ user_id: userId, ...prev, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) {
      logger.error('Notification prefs save error', { error: error.message })
      setPrefs(prev)
      toast('Erreur de sauvegarde', 'error')
    }
  }

  const toggle = (key: keyof NotifPrefs) => {
    savePref({ [key]: !prefs[key] })
  }

  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const h = i.toString().padStart(2, '0')
    return [`${h}:00`, `${h}:30`]
  }).flat()

  if (loading) return (
    <div className="bg-transparent flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.back()} aria-label="Retour" className="p-2.5 rounded-xl"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Préférences</h2>
      </header>
      <div className="flex-1 px-4 space-y-6 pb-8 overflow-y-auto">
        {[1, 2, 3].map(i => (
          <div key={i}>
            <div className="h-3 w-24 bg-[var(--border)] rounded mb-2 animate-pulse" />
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              {[1, 2, 3].map(j => (
                <div key={j} className="px-4 py-3.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded bg-[var(--border)] animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-[var(--border)] rounded animate-pulse" />
                    </div>
                    <div className="w-10 h-5 rounded-full bg-[var(--border)] animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <h1 className="sr-only">Préférences de notification</h1>
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.back()} aria-label="Retour" className="p-2.5 rounded-xl"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--textPrimary)' }}>Préférences</h2>
      </header>
      <div className="flex-1 px-4 space-y-6 pb-8 overflow-y-auto">

        <div>
          <h3 className="text-sm font-semibold tracking-wider mb-2 px-1" style={{ color: 'var(--textSecondary)' }}>Canaux</h3>
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            {channelItems.map(({ key, label, desc, icon: Icon }, idx) => (
              <div key={key}
                className={`px-4 py-3.5 ${idx < channelItems.length - 1 ? 'border-b' : ''}`}
                style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3">
                  <Icon size={20} className="shrink-0 text-[var(--textMuted)]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--textPrimary)' }}>{label}</p>
                    <p className="text-xs" style={{ color: 'var(--textSecondary)' }}>{desc}</p>
                  </div>
                  <ToggleSwitch enabled={!!prefs[key]} onChange={() => toggle(key)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold tracking-wider mb-2 px-1" style={{ color: 'var(--textSecondary)' }}>Notifications</h3>
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            {notifTypes.map(({ key, label, icon: Icon }, idx) => (
              <div key={key}
                className={`px-4 py-3.5 ${idx < notifTypes.length - 1 ? 'border-b' : ''}`}
                style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3">
                  <Icon size={20} className="shrink-0 text-[var(--textMuted)]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--textPrimary)' }}>{label}</p>
                  </div>
                  <ToggleSwitch enabled={!!prefs[key]} onChange={() => toggle(key)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold tracking-wider mb-2 px-1 flex items-center gap-2" style={{ color: 'var(--textSecondary)' }}>
            <Moon size={14} /> Mode silencieux
          </h3>
          <div className="glass-card rounded-xl p-4 space-y-3">
            <div>
              <label className="text-xs text-[var(--textSecondary)] mb-1 block">Début</label>
              <select
                value={prefs.quiet_hours_start ?? ''}
                onChange={e => savePref({ quiet_hours_start: e.target.value || null })}
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                style={{ background: 'var(--surfaceElevated)', borderColor: 'var(--border)', color: 'var(--textPrimary)' }}
              >
                <option value="">Désactivé</option>
                {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--textSecondary)] mb-1 block">Fin</label>
              <select
                value={prefs.quiet_hours_end ?? ''}
                onChange={e => savePref({ quiet_hours_end: e.target.value || null })}
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                style={{ background: 'var(--surfaceElevated)', borderColor: 'var(--border)', color: 'var(--textPrimary)' }}
              >
                <option value="">Désactivé</option>
                {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
