'use client'

import Image from 'next/image'
import { MapPin, Calendar, Users } from 'lucide-react'
import type { EventItem } from '@/lib/events'

const CATEGORY_EMOJIS: Record<string, string> = {
  sport: '⚽', culture: '🎨', food: '🍽️', music: '🎵',
  travel: '✈️', games: '🎮', workshop: '🔧', other: '📌',
}

interface EventCardProps {
  event: EventItem
  joined: boolean
  participantCount: number
  onToggle: (eventId: string, join: boolean) => void
}

export function EventCard({ event, joined, participantCount, onToggle }: EventCardProps) {
  const catEmoji = CATEGORY_EMOJIS[event.category ?? 'other'] ?? '📌'
  const dateStr = event.event_date
    ? new Date(event.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden border border-[#2A2826]">
      {event.image_url && (
        <div className="relative w-full aspect-video bg-[#262628]">
          <Image
            src={event.image_url}
            alt={event.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm">{catEmoji}</span>
              {event.category && (
                <span className="text-[10px] uppercase tracking-wider text-[#D92D4A] font-medium">{event.category}</span>
              )}
            </div>
            <h3 className="font-semibold text-sm truncate">{event.title}</h3>
          </div>
        </div>

        {event.description && (
          <p className="text-xs text-[#9E9488] mt-2 line-clamp-2 leading-relaxed">{event.description}</p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-[11px] text-[#9E9488]">
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin size={11} /> {event.location}
            </span>
          )}
          {dateStr && (
            <span className="flex items-center gap-1">
              <Calendar size={11} /> {dateStr}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users size={11} />
            {participantCount}{event.max_participants ? `/${event.max_participants}` : ''}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {event.creator && (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-[#262628] overflow-hidden">
                {event.creator.photos?.[0] && (
                  <Image src={event.creator.photos[0]} alt="" width={20} height={20} className="object-cover w-full h-full" />
                )}
              </div>
              <span className="text-[10px] text-[#9E9488]">{event.creator.name}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => onToggle(event.id, !joined)}
            className={`ml-auto px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
              joined
                ? 'bg-[#D92D4A]/10 text-[#D92D4A] border border-[#D92D4A]/20'
                : 'bg-[#D92D4A] text-white hover:bg-[#D92D4A]/90'
            }`}
          >
            {joined ? '✓ Participé' : 'Participer'}
          </button>
        </div>
      </div>
    </div>
  )
}
