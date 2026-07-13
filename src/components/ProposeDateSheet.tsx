'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Loader, MapPin, MessageSquareText, Utensils, Coffee, Film, GlassWater, TreePine, Hotel, MoreHorizontal } from 'lucide-react'
import { FocusTrap } from '@/components/FocusTrap'
import { useToast } from '@/components/Toast'
import { proposeDate } from '@/lib/dates'
import { supabase } from '@/lib/supabase/client'

const CATEGORIES = [
  { value: 'restaurant', label: 'Restaurant', icon: Utensils, color: '#ef4444' },
  { value: 'cafe', label: 'Café', icon: Coffee, color: '#f59e0b' },
  { value: 'cinema', label: 'Cinéma', icon: Film, color: '#8b5cf6' },
  { value: 'bar', label: 'Bar', icon: GlassWater, color: '#06b6d4' },
  { value: 'walk', label: 'Balade', icon: TreePine, color: '#22c55e' },
  { value: 'hotel', label: 'Hôtel', icon: Hotel, color: '#ec4899' },
  { value: 'other', label: 'Autre', icon: MoreHorizontal, color: '#6b7280' },
] as const

type CategoryValue = (typeof CATEGORIES)[number]['value']

interface MatchOption {
  id: string
  matchId: string
  name: string
  photo: string | null
}

interface SlotInput {
  proposed_date: string
  proposed_time: string
}

interface ProposeDateSheetProps {
  onClose: () => void
  onCreated: () => void
}

export function ProposeDateSheet({ onClose, onCreated }: ProposeDateSheetProps) {
  const { toast } = useToast()
  const [matches, setMatches] = useState<MatchOption[]>([])
  const [selectedMatchId, setSelectedMatchId] = useState('')
  const [category, setCategory] = useState<CategoryValue>('restaurant')
  const [slots, setSlots] = useState<SlotInput[]>([{ proposed_date: '', proposed_time: '' }])
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: matchRows } = await supabase
        .from('matches')
        .select('id, user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
      if (!matchRows) { setInitialLoading(false); return }

      const otherIds = matchRows.map(m => m.user1_id === user.id ? m.user2_id : m.user1_id)
      const { data: pData } = await supabase
        .from('profiles')
        .select('id, name, photos')
        .in('id', otherIds)

      const list: MatchOption[] = matchRows.map(m => {
        const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id
        const p = (pData ?? []).find((p: { id: string }) => p.id === otherId)
        return {
          id: otherId,
          matchId: m.id,
          name: (p as { name?: string })?.name ?? 'Inconnu',
          photo: ((p as { photos?: string[] })?.photos ?? [])[0] ?? null,
        }
      }).filter(m => m.name !== 'Inconnu')

      setMatches(list)
      setInitialLoading(false)
    })
  }, [])

  const addSlot = () => {
    setSlots(prev => [...prev, { proposed_date: '', proposed_time: '' }])
  }

  const removeSlot = (idx: number) => {
    setSlots(prev => prev.filter((_, i) => i !== idx))
  }

  const updateSlot = (idx: number, field: keyof SlotInput, value: string) => {
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  const validate = (): boolean => {
    if (!selectedMatchId) { toast('Sélectionne un match', 'error'); return false }
    const validSlots = slots.filter(s => s.proposed_date && s.proposed_time)
    if (validSlots.length === 0) { toast('Ajoute au moins un créneau', 'error'); return false }
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    const validSlots = slots.filter(s => s.proposed_date && s.proposed_time)
    const { error } = await proposeDate({
      matchId: selectedMatchId,
      category: category as import('@/lib/dates').PlannedDate['category'],
      slots: validSlots,
      location: location.trim() || undefined,
      note: note.trim() || undefined,
    })
    setLoading(false)
    if (error) { toast(error, 'error'); return }
    toast('Rendez-vous proposé !', 'success')
    onCreated()
  }

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <FocusTrap><div className="bg-[var(--card)] w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col border border-[var(--border)]">
        <div className="sticky top-0 bg-[var(--card)] z-10 flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--border)] shrink-0">
          <h2 className="font-semibold">Proposer un rendez-vous</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-2.5 rounded-xl">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {initialLoading ? (
            <div className="flex justify-center py-8">
              <Loader size={20} className="animate-spin text-muted" />
            </div>
          ) : (
            <>
              {/* Match selection */}
              <div>
                <label className="text-[11px] font-medium text-[var(--textSecondary)] uppercase tracking-wider">Avec qui ?</label>
                <select value={selectedMatchId} onChange={e => setSelectedMatchId(e.target.value)}
                  className="w-full bg-[var(--surfaceElevated)] rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:ring-1 focus:ring-[var(--primary)]">
                  <option value="">Choisis un match...</option>
                  {matches.map(m => (
                    <option key={m.matchId} value={m.matchId}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="text-[11px] font-medium text-[var(--textSecondary)] uppercase tracking-wider">Catégorie</label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {CATEGORIES.map(cat => (
                    <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
                        category === cat.value
                          ? 'bg-primary/20 text-primary border border-[var(--primary)]/30'
                          : 'bg-[var(--surfaceElevated)] text-[var(--textSecondary)] border border-transparent hover:border-[var(--border)]'
                      }`}>
                      <cat.icon size={14} />
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date/time slots */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-medium text-[var(--textSecondary)] uppercase tracking-wider">Créneaux</label>
                  <button type="button" onClick={addSlot} className="text-xs text-primary flex items-center gap-1">
                    <Plus size={12} /> Ajouter un créneau
                  </button>
                </div>
                <div className="space-y-2">
                  {slots.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-[var(--surfaceElevated)] rounded-xl p-3">
                      <div className="flex-1">
                        <input type="date" value={slot.proposed_date}
                          onChange={e => updateSlot(idx, 'proposed_date', e.target.value)}
                          className="w-full bg-transparent text-sm outline-none" />
                      </div>
                      <div className="flex-1">
                        <input type="time" value={slot.proposed_time}
                          onChange={e => updateSlot(idx, 'proposed_time', e.target.value)}
                          className="w-full bg-transparent text-sm outline-none" />
                      </div>
                      {slots.length > 1 && (
                        <button type="button" onClick={() => removeSlot(idx)} aria-label="Supprimer"
                          className="p-1.5 rounded-lg hover:bg-error/10 text-secondary hover:text-error transition">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="text-[11px] font-medium text-[var(--textSecondary)] uppercase tracking-wider">Lieu (optionnel)</label>
                <div className="relative mt-1">
                  <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                    placeholder="Paris 11e, Chez Michel..."
                    className="w-full bg-[var(--surfaceElevated)] rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[var(--primary)]" />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-[11px] font-medium text-[var(--textSecondary)] uppercase tracking-wider">Note (optionnel)</label>
                <div className="relative mt-1">
                  <MessageSquareText size={14} className="absolute left-3.5 top-3 text-muted" />
                  <textarea value={note} onChange={e => setNote(e.target.value)}
                    placeholder="Un petit mot pour ton rendez-vous..."
                    rows={3} maxLength={300}
                    className="w-full bg-[var(--surfaceElevated)] rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[var(--primary)] resize-none" />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-[var(--card)] z-10 border-t border-[var(--border)] px-5 py-3 shrink-0">
          <button type="button" disabled={loading || initialLoading}
            onClick={handleSubmit}
            className="w-full bg-[var(--primary)] text-[var(--textOnPrimary)] rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[var(--primaryLight)] transition disabled:opacity-40">
            {loading && <Loader size={14} className="animate-spin" />}
            {loading ? 'Envoi...' : 'Proposer le rendez-vous'}
          </button>
        </div>
      </div></FocusTrap>
    </div>
  )
}
