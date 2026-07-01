'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, MapPin, Calendar, Users, Trash2, Loader } from 'lucide-react'
import { getEventById, joinEvent, leaveEvent, getParticipants, deleteEvent, type EventItem, type EventParticipant } from '@/lib/events'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'

const CATEGORY_EMOJIS: Record<string, string> = {
  sport: '⚽', culture: '🎨', food: '🍽️', music: '🎵',
  travel: '✈️', games: '🎮', workshop: '🔧', other: '📌',
}

export default function EventDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { toast } = useToast()
  const { confirm } = useConfirm()

  const [event, setEvent] = useState<EventItem | null>(null)
  const [participants, setParticipants] = useState<EventParticipant[]>([])
  const [myId, setMyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setMyId(data.user.id)
    })
    Promise.all([
      getEventById(id).then(r => setEvent(r.data)),
      getParticipants(id).then(r => setParticipants(r.data)),
    ]).finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="bg-transparent flex-1 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
    </div>
  )

  if (!event) return (
    <div className="bg-transparent flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.back()} aria-label="Retour" className="p-1"><ArrowLeft size={22} /></button>
      </header>
      <div className="flex-1 flex items-center justify-center text-secondary text-sm">Événement introuvable</div>
    </div>
  )

  const joined = participants.some(p => p.user_id === myId && p.status === 'accepted')
  const isCreator = event.creator_id === myId
  const catEmoji = CATEGORY_EMOJIS[event.category ?? 'other'] ?? '📌'
  const dateStr = event.event_date
    ? new Date(event.event_date).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  const handleToggle = async () => {
    if (joining) return
    setJoining(true)
    if (joined) {
      const { error } = await leaveEvent(id)
      if (error) { toast(error, 'error') } else {
        const r = await getParticipants(id)
        setParticipants(r.data)
      }
    } else {
      const { error } = await joinEvent(id)
      if (error) { toast(error, 'error') } else {
        const r = await getParticipants(id)
        setParticipants(r.data)
      }
    }
    setJoining(false)
  }

  const handleDelete = async () => {
    if (!await confirm('Supprimer cet événement définitivement ?')) return
    const { error } = await deleteEvent(id)
    if (error) { toast(error, 'error'); return }
    toast('Événement supprimé', 'success')
    router.replace('/events')
  }

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.back()} aria-label="Retour" className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-lg font-bold">Événement</h2>
        <div className="flex-1" />
        {isCreator && (
          <button type="button" onClick={handleDelete} aria-label="Supprimer" className="p-1 text-secondary hover:text-primary transition">
            <Trash2 size={18} />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto pb-8">
        {/* Image */}
        {event.image_url && (
          <div className="relative w-full aspect-video bg-[var(--surfaceElevated)]">
            <Image src={event.image_url} alt={event.title} fill className="object-cover" sizes="100vw" priority />
          </div>
        )}

        <div className="px-5 mt-5 space-y-4">
          {/* Title + category */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{catEmoji}</span>
              {event.category && (
                <span className="text-[10px] uppercase tracking-wider text-primary font-medium bg-[var(--primary)]/10 px-2 py-0.5 rounded-full">
                  {event.category}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold">{event.title}</h1>
          </div>

          {/* Meta */}
          <div className="space-y-2 text-sm text-secondary">
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin size={14} className="shrink-0" />
                <span>{event.location}</span>
              </div>
            )}
            {dateStr && (
              <div className="flex items-center gap-2">
                <Calendar size={14} className="shrink-0" />
                <span className="capitalize">{dateStr}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users size={14} className="shrink-0" />
              <span>{participants.length}{event.max_participants ? ` / ${event.max_participants}` : ''} participant{participants.length > 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div>
              <h3 className="text-[11px] font-medium text-secondary uppercase tracking-wider mb-1">Description</h3>
              <p className="text-sm leading-relaxed text-theme">{event.description}</p>
            </div>
          )}

          {/* Creator */}
          {event.creator && (
            <div>
              <h3 className="text-[11px] font-medium text-secondary uppercase tracking-wider mb-2">Organisateur</h3>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[var(--surfaceElevated)] overflow-hidden">
                  {event.creator.photos?.[0] && (
                    <Image src={event.creator.photos[0]} alt={event.creator.name} width={36} height={36} className="object-cover w-full h-full" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{event.creator.name}</p>
                  {event.creator.occupation && (
                    <p className="text-[11px] text-secondary">{event.creator.occupation}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Participants list */}
          {participants.length > 0 && (
            <div>
              <h3 className="text-[11px] font-medium text-secondary uppercase tracking-wider mb-2">
                Participants ({participants.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {participants.map(p => (
                  <div key={p.id} className="flex items-center gap-2 bg-[var(--surfaceElevated)] rounded-full pl-1 pr-3 py-1 border border-[var(--border)]">
                    <div className="w-7 h-7 rounded-full bg-[var(--surfaceElevated)] overflow-hidden shrink-0">
                      {p.profile?.photos?.[0] && (
                        <Image src={p.profile.photos[0]} alt={p.profile.name} width={28} height={28} className="object-cover w-full h-full" />
                      )}
                    </div>
                    <span className="text-xs font-medium">{p.profile?.name ?? 'Inconnu'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          {!isCreator && (
            <button
              type="button"
              onClick={handleToggle}
              disabled={joining}
              className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition ${
                joined
                  ? 'bg-[var(--surfaceElevated)] text-primary border border-[var(--primary)]/30'
                  : 'bg-primary text-on-primary hover:bg-primary/90'
              }`}
            >
              {joining && <Loader size={14} className="animate-spin" />}
              {joining ? 'Chargement...' : joined ? 'Se désister' : 'Participer'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
