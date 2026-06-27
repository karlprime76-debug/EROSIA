'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Calendar, Users, Plus } from 'lucide-react'
import { getEvents, joinEvent, leaveEvent } from '@/lib/api'
import { supabase } from '@/lib/supabase/client'

interface EventItem {
  id: string
  title: string
  description?: string
  location?: string
  event_date?: string
  type?: string
  max_participants?: number
  participants?: { user_id: string; status: string }[]
}

export default function EventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<EventItem[]>([])
  const [myId, setMyId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setMyId(data.user.id)
    }).catch(() => {})
    getEvents().then(({ data }) => {
      if (data) setEvents(data as EventItem[])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const isJoined = (e: EventItem) => e.participants?.some(p => p.user_id === myId && p.status === 'accepted')
  const participantCount = (e: EventItem) => e.participants?.filter(p => p.status === 'accepted').length ?? 0

  const handleJoin = async (eventId: string) => {
    await joinEvent(eventId)
    const { data } = await getEvents()
    if (data) setEvents(data)
  }

  const handleLeave = async (eventId: string) => {
    await leaveEvent(eventId)
    const { data } = await getEvents()
    if (data) setEvents(data)
  }

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button onClick={() => router.back()} aria-label="Retour" className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Antennes</h2>
        <div className="flex-1" />
        <button onClick={() => router.push('/events/create')} aria-label="Créer une antenne"
          className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#D92D4A' }}>
          <Plus size={18} />
        </button>
      </header>
      <div className="flex-1 px-4 pb-8 overflow-y-auto space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: '#D92D4A', borderTopColor: 'transparent' }} /></div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-[#9E9488] text-sm">Aucun événement à venir</p>
            <p className="text-[#6B6258] text-xs mt-1">Sois le premier à créer une antenne</p>
          </div>
        ) : events.map(e => (
          <div key={e.id} className="bg-[#1C1C1E] rounded-xl border border-[#2A2826] p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#D92D4A]/10 flex items-center justify-center shrink-0 text-lg">
                {e.type === 'date_night' ? '💑' : e.type === 'meetup' ? '🤝' : e.type === 'party' ? '🎉' : '📍'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">{e.title}</h3>
                {e.description && <p className="text-xs text-[#9E9488] mt-0.5 line-clamp-2">{e.description}</p>}
                <div className="flex flex-wrap gap-3 mt-2">
                  {e.location && <span className="text-[10px] text-[#6B6258] flex items-center gap-1"><MapPin size={10} />{e.location}</span>}
                  {e.event_date && <span className="text-[10px] text-[#6B6258] flex items-center gap-1"><Calendar size={10} />{new Date(e.event_date).toLocaleDateString('fr-FR')}</span>}
                  <span className="text-[10px] text-[#6B6258] flex items-center gap-1"><Users size={10} />{participantCount(e)}{e.max_participants ? `/${e.max_participants}` : ''}</span>
                </div>
              </div>
              <button onClick={() => isJoined(e) ? handleLeave(e.id) : handleJoin(e.id)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${isJoined(e) ? 'bg-[#262628] text-[#9E9488]' : 'bg-[#D92D4A] text-white'}`}>
                {isJoined(e) ? 'Quitter' : 'Participer'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
