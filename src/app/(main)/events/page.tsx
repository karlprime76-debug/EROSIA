'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search, Plus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { getEvents, createEvent, joinEvent, leaveEvent, type EventItem, type CreateEventInput, type EventCategory } from '@/lib/events'
import { EVENT_CATEGORIES } from '@/lib/events'
import { useToast } from '@/components/Toast'
import { EventCard } from '@/components/EventCard'
import { EventForm } from '@/components/EventForm'

export default function EventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<EventItem[]>([])
  const [myId, setMyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedCat, setSelectedCat] = useState<EventCategory | null>(null)
  const { toast } = useToast()
  const searchRef = useRef<HTMLInputElement>(null)

  const fetchEvents = useCallback(async () => {
    const { data } = await getEvents(
      { query: query || undefined, category: selectedCat ?? undefined },
    )
    if (data) setEvents(data)
  }, [query, selectedCat])

  useEffect(() => {
    let cancelled = false
    const initialize = async () => {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user && !cancelled) setMyId(data.user.id)
      }).catch(() => {})
      await fetchEvents()
      if (!cancelled) setLoading(false)
    }
    initialize()
    return () => { cancelled = true }
  }, [fetchEvents])

  const isJoined = (e: EventItem) =>
    e.participants?.some(p => p.user_id === myId && p.status === 'accepted')
  const participantCount = (e: EventItem) =>
    e.participants?.filter(p => p.status === 'accepted').length ?? 0

  const handleToggle = async (eventId: string, join: boolean) => {
    const { error } = join ? await joinEvent(eventId) : await leaveEvent(eventId)
    if (error) { toast(error, 'error'); return }
    await fetchEvents()
  }

  const handleCreate = async (input: CreateEventInput, file?: File) => {
    const { error } = await createEvent(input, file)
    if (error) { toast(error, 'error'); return }
    toast('Événement créé ✓', 'success')
    setShowForm(false)
    await fetchEvents()
  }

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.back()} aria-label="Retour" className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Antennes</h2>
        <div className="flex-1" />
        <button type="button" onClick={() => setShowForm(true)} aria-label="Créer"
          className="w-9 h-9 rounded-full flex items-center justify-center bg-primary">
          <Plus size={18} />
        </button>
      </header>

      {/* Search */}
      <div className="px-4 pb-2">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher un événement..."
            className="w-full bg-surface-elevated rounded-xl pl-9 pr-9 py-2.5 text-sm outline-none border border-theme focus:border-primary/40 transition placeholder:text-secondary"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(''); searchRef.current?.focus() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Category filters */}
      <div className="px-4 pb-3 overflow-x-auto scrollbar-none">
        <div className="flex gap-1.5 min-w-max">
          {EVENT_CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCat(selectedCat === cat ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition ${
                selectedCat === cat
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-surface-elevated text-secondary border border-theme hover:border-secondary'
              }`}
            >
              {cat === 'sport' && '⚽ '}{cat === 'culture' && '🎨 '}{cat === 'food' && '🍽️ '}
              {cat === 'music' && '🎵 '}{cat === 'travel' && '✈️ '}{cat === 'games' && '🎮 '}
              {cat === 'workshop' && '🔧 '}{cat === 'other' && '📌 '}
              {cat === 'other' ? 'Autre' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 px-4 pb-8 overflow-y-auto space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center mt-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent mx-auto mb-4 flex items-center justify-center border border-primary/10">
              <span className="text-2xl opacity-40">📅</span>
            </div>
            <p className="text-base font-semibold">Aucun événement trouvé</p>
            <p className="text-secondary text-sm mt-1">Crée le premier événement !</p>
          </div>
        ) : (
          events.map(event => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <EventCard
                event={event}
                joined={isJoined(event)}
                participantCount={participantCount(event)}
                onToggle={handleToggle}
              />
            </Link>
          ))
        )}
      </div>

      {showForm && <EventForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />}
    </div>
  )
}
