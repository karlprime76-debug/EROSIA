'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Lock } from 'lucide-react'
import { createEvent, checkPremium } from '@/lib/api'
import { useToast } from '@/components/Toast'

const types: { value: 'date_night' | 'meetup' | 'party' | 'other'; label: string }[] = [
  { value: 'date_night', label: 'Date night' },
  { value: 'meetup', label: 'Meetup' },
  { value: 'party', label: 'Soirée' },
  { value: 'other', label: 'Autre' },
]

export default function CreateEventPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [type, setType] = useState<'date_night' | 'meetup' | 'party' | 'other'>('other')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [saving, setSaving] = useState(false)
  const [isPremium, setIsPremium] = useState<boolean | null>(null)

  useEffect(() => { checkPremium().then(setIsPremium) }, [])

  const handleSubmit = async () => {
    if (!title) { toast('Le titre est requis.', 'error'); return }
    setSaving(true)
    try {
      await createEvent({
        title, description: description || undefined, location: location || undefined,
        event_date: eventDate ? new Date(eventDate).toISOString() : undefined,
        type, max_participants: maxParticipants ? parseInt(maxParticipants) : undefined,
      })
      router.push('/events')
    } catch {
      setSaving(false)
      toast("Erreur lors de la création de l'antenne. Réessaie.", 'error')
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.back()} aria-label="Retour" className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Créer une antenne</h2>
      </header>
      <div className="flex-1 px-4 pb-8 space-y-4 overflow-y-auto">
        <div>
          <label className="text-xs text-[#9E9488] font-medium mb-1 block">Titre *</label>
          <input value={title} onChange={e => setTitle(e.target.value.slice(0, 100))} placeholder="Soirée cinéma..." maxLength={100}
            className="w-full px-4 py-3 rounded-xl bg-[#1C1C1E] border border-[#2A2826] text-white text-sm outline-none focus:border-[#D92D4A]" />
          <p className="text-[10px] text-right text-[#6B6258] mt-0.5">{title.length}/100</p>
        </div>
        <div>
          <label className="text-xs text-[#9E9488] font-medium mb-1 block">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 500))} placeholder="Quelques détails..."
            rows={3} maxLength={500} className="w-full px-4 py-3 rounded-xl bg-[#1C1C1E] border border-[#2A2826] text-white text-sm outline-none focus:border-[#D92D4A] resize-none" />
          <p className="text-[10px] text-right text-[#6B6258] mt-0.5">{description.length}/500</p>
        </div>
        <div>
          <label className="text-xs text-[#9E9488] font-medium mb-1 block">Lieu</label>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Paris 11e"
            className="w-full px-4 py-3 rounded-xl bg-[#1C1C1E] border border-[#2A2826] text-white text-sm outline-none focus:border-[#D92D4A]" />
        </div>
        <div>
          <label className="text-xs text-[#9E9488] font-medium mb-1 block">Date</label>
          <input type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#1C1C1E] border border-[#2A2826] text-white text-sm outline-none focus:border-[#D92D4A]" />
        </div>
        <div>
          <label className="text-xs text-[#9E9488] font-medium mb-1 block">Type</label>
          <div className="flex gap-2">
            {types.map(t => (
              <button type="button" key={t.value} onClick={() => setType(t.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${type === t.value ? 'bg-[#D92D4A] text-white' : 'bg-[#1C1C1E] text-[#9E9488] border border-[#2A2826]'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-[#9E9488] font-medium mb-1 block">Max participants</label>
          <input type="number" value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)} placeholder="50"
            className="w-full px-4 py-3 rounded-xl bg-[#1C1C1E] border border-[#2A2826] text-white text-sm outline-none focus:border-[#D92D4A]" />
        </div>
        {isPremium === false ? (
          <button type="button" onClick={() => router.push('/settings')}
            className="w-full py-3.5 rounded-full font-semibold text-white flex items-center justify-center gap-2 bg-[#262628]">
            <Lock size={16} /> Premium requis
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={!title || saving}
            className="w-full py-3.5 rounded-full font-semibold text-white disabled:opacity-50" style={{ background: '#D92D4A' }}>
            {saving ? 'Création...' : 'Créer l\'antenne'}
          </button>
        )}
      </div>
    </div>
  )
}
