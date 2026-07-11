'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Calendar, Clock, MapPin, Check, X, AlertCircle,
  Plus, Utensils, Coffee, Film, GlassWater,
  TreePine, Hotel, MoreHorizontal, History
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'
import type { DateSlot } from '@/lib/dates'

const CATEGORIES = [
  { value: 'restaurant', label: 'Restaurant', icon: Utensils, color: '#ef4444' },
  { value: 'cafe', label: 'Café', icon: Coffee, color: '#f59e0b' },
  { value: 'cinema', label: 'Cinéma', icon: Film, color: '#8b5cf6' },
  { value: 'bar', label: 'Bar', icon: GlassWater, color: '#06b6d4' },
  { value: 'walk', label: 'Balade', icon: TreePine, color: '#22c55e' },
  { value: 'hotel', label: 'Hôtel', icon: Hotel, color: '#ec4899' },
  { value: 'other', label: 'Autre', icon: MoreHorizontal, color: '#6b7280' },
] as const

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Accepté',
  confirmed: 'Confirmé',
  declined: 'Refusé',
  cancelled: 'Annulé',
  completed: 'Terminé',
}

interface PlannedDateItem {
  id: string
  match_id: string
  proposer_id: string
  proposee_id: string
  status: string
  category: string
  location: string | null
  note: string | null
  cancelled_by: string | null
  cancel_reason: string | null
  confirmed_at: string | null
  slots: DateSlot[]
  match_user_name: string
  match_user_photo: string | null
  created_at: string
}

function getCategoryMeta(value: string) {
  return CATEGORIES.find(c => c.value === value) ?? CATEGORIES[6]
}

export default function DatesPage() {
  const [dates, setDates] = useState<PlannedDateItem[]>([])
  const [history, setHistory] = useState<PlannedDateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming')
  const [userId, setUserId] = useState<string | null>(null)
  const { toast } = useToast()
  const loadedRef = useRef(false)

  const loadDates = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data: upcoming } = await supabase.rpc('get_upcoming_dates', { p_user_id: user.id })
    if (upcoming) setDates(upcoming as unknown as PlannedDateItem[])
    const { data: past } = await supabase
      .from('planned_dates')
      .select('*, date_slots(*)')
      .or(`proposer_id.eq.${user.id},proposee_id.eq.${user.id}`)
      .in('status', ['declined', 'cancelled', 'completed'])
      .order('updated_at', { ascending: false })
      .limit(20)
    if (past) setHistory(past as unknown as PlannedDateItem[])
    setLoading(false)
  }, [])

  useEffect(() => { if (!loadedRef.current) { loadedRef.current = true; loadDates() } }, [loadDates])

  const handleRespond = async (dateId: string, accept: boolean, slotId?: string) => {
    const res = await fetch('/api/dates/respond', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateId, accept, slotId }),
    })
    const json = await res.json()
    if (!res.ok) { toast(json.error ?? 'Erreur', 'error'); return }
    toast(accept ? 'Rendez-vous accepté !' : 'Rendez-vous refusé', 'success')
    loadDates()
  }

  const handleCancel = async (dateId: string) => {
    const res = await fetch(`/api/dates/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateId }),
    })
    const json = await res.json()
    if (!res.ok) { toast(json.error ?? 'Erreur', 'error'); return }
    toast('Rendez-vous annulé', 'success')
    loadDates()
  }

  const handleConfirm = async (dateId: string) => {
    const res = await fetch(`/api/dates/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateId }),
    })
    const json = await res.json()
    if (!res.ok) { toast(json.error ?? 'Erreur', 'error'); return }
    toast('Rendez-vous confirmé !', 'success')
    loadDates()
  }

  return (
    <div className="flex-1 flex flex-col bg-transparent">
      <header className="px-5 pt-6 pb-3">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-bold">Rendez-vous</h1>
          <button type="button" disabled
            className="p-2.5 rounded-full bg-primary/30 text-on-primary cursor-not-allowed"
            aria-label="Proposer un rendez-vous">
            <Plus size={20} />
          </button>
        </div>
        <p className="text-secondary text-sm">Planifie et gère tes rendez-vous</p>
      </header>

      <div className="px-4 pb-3 flex gap-2">
        {(['upcoming', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              tab === t ? 'bg-primary text-theme' : 'bg-surface text-secondary border border-theme'
            }`}>
            {t === 'upcoming' ? 'À venir' : 'Historique'}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center mt-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'upcoming' && dates.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-16 text-center">
            <Calendar size={48} className="text-muted mb-4" />
            <h3 className="font-semibold text-lg">Aucun rendez-vous</h3>
            <p className="text-secondary text-sm mt-1 max-w-xs">Propose un rendez-vous à un match pour commencer.</p>
          </div>
        ) : tab === 'history' && history.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-16 text-center">
            <History size={48} className="text-muted mb-4" />
            <h3 className="font-semibold text-lg">Aucun historique</h3>
            <p className="text-secondary text-sm mt-1 max-w-xs">Tes rendez-vous passés apparaîtront ici.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {(tab === 'upcoming' ? dates : history).map(d => {
              const meta = getCategoryMeta(d.category)
              const Icon = meta.icon
              const acceptedSlot = d.slots?.find((s: DateSlot) => s.accepted)

              return (
                <motion.div key={d.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-2xl p-4 mb-3">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: `${meta.color}20` }}>
                      <Icon size={18} style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{d.match_user_name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          d.status === 'pending' ? 'bg-warning/20 text-warning' :
                          d.status === 'accepted' ? 'bg-primary/20 text-primary' :
                          d.status === 'confirmed' ? 'bg-success/20 text-success' :
                          'bg-surface text-muted'
                        }`}>
                          {STATUS_LABELS[d.status]}
                        </span>
                      </div>
                      <span className="text-xs text-secondary capitalize">{meta.label}</span>
                    </div>
                    <div className="flex gap-1">
                      {d.status === 'accepted' && d.proposee_id === userId && (
                        <button type="button" onClick={() => handleConfirm(d.id)}
                          className="p-2 rounded-lg bg-success/20 text-success active:scale-90 transition"
                          aria-label="Confirmer">
                          <Check size={16} />
                        </button>
                      )}
                      {(d.status === 'pending' || d.status === 'accepted') && (
                        <button type="button" onClick={() => handleCancel(d.id)}
                          className="p-2 rounded-lg bg-error/20 text-error active:scale-90 transition"
                          aria-label="Annuler">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {d.note && (
                    <p className="text-xs text-secondary mb-2 italic">&ldquo;{d.note}&rdquo;</p>
                  )}

                  <div className="space-y-1.5">
                    {d.slots?.map((slot: DateSlot) => (
                      <div key={slot.id}
                        className={`flex items-center gap-2 text-xs p-2 rounded-lg ${
                          slot.accepted ? 'bg-primary/10 text-primary' : 'bg-surface text-secondary'
                        }`}>
                        <Calendar size={12} />
                        <span>{new Date(slot.proposed_date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                        <Clock size={12} />
                        <span>{slot.proposed_time}</span>
                        {slot.accepted && <Check size={12} className="ml-auto text-success" />}
                        {!slot.accepted && d.status === 'pending' && d.proposee_id === userId && (
                          <button type="button" onClick={() => handleRespond(d.id, true, slot.id)}
                            className="ml-auto px-2 py-0.5 rounded-full bg-primary text-on-primary text-[9px] font-medium active:scale-90 transition">
                            Choisir
                          </button>
                        )}
                      </div>
                    ))}
                    {(!d.slots || d.slots.length === 0) && acceptedSlot && (
                      <div className="flex items-center gap-2 text-xs p-2 rounded-lg bg-primary/10 text-primary">
                        <Clock size={12} />
                        <span>
                          {new Date(acceptedSlot.proposed_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                          {' à '}
                          {acceptedSlot.proposed_time}
                        </span>
                      </div>
                    )}
                  </div>

                  {d.location && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-secondary">
                      <MapPin size={12} />
                      <span>{d.location}</span>
                    </div>
                  )}

                  {(d.status === 'cancelled' && d.cancel_reason) && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-error">
                      <AlertCircle size={12} />
                      <span>{d.cancel_reason}</span>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
