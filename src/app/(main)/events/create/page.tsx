'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createEvent } from '@/lib/api'

const types = [
  { value: 'date_night', label: 'Date night' },
  { value: 'meetup', label: 'Meetup' },
  { value: 'party', label: 'Soirée' },
  { value: 'other', label: 'Autre' },
]

export default function CreateEventPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [type, setType] = useState<string>('other')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!title) return
    setSaving(true)
    await createEvent({
      title, description: description || undefined, location: location || undefined,
      event_date: eventDate ? new Date(eventDate).toISOString() : undefined,
      type: type as any, max_participants: maxParticipants ? parseInt(maxParticipants) : undefined,
    })
    setSaving(false)
    router.push('/events')
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button onClick={() => router.back()} className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Créer une antenne</h2>
      </header>
      <div className="flex-1 px-4 pb-8 space-y-4 overflow-y-auto">
        <div>
          <label className="text-xs text-[#9E9488] font-medium mb-1 block">Titre *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Soirée cinéma..."
            className="w-full px-4 py-3 rounded-xl bg-[#1C1C1E] border border-[#2A2826] text-white text-sm outline-none focus:border-[#D92D4A]" />
        </div>
        <div>
          <label className="text-xs text-[#9E9488] font-medium mb-1 block">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Quelques détails..."
            rows={3} className="w-full px-4 py-3 rounded-xl bg-[#1C1C1E] border border-[#2A2826] text-white text-sm outline-none focus:border-[#D92D4A] resize-none" />
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
              <button key={t.value} onClick={() => setType(t.value)}
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
        <button onClick={handleSubmit} disabled={!title || saving}
          className="w-full py-3.5 rounded-full font-semibold text-white disabled:opacity-50" style={{ background: '#D92D4A' }}>
          {saving ? 'Création...' : 'Créer l\'antenne'}
        </button>
      </div>
    </div>
  )
}
