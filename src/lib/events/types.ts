export const EVENT_CATEGORIES = [
  'sport', 'culture', 'food', 'music', 'travel', 'games', 'workshop', 'other',
] as const
export type EventCategory = (typeof EVENT_CATEGORIES)[number]

export interface EventItem {
  id: string
  creator_id: string
  title: string
  description: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  event_date: string | null
  max_participants: number | null
  type: string
  category: EventCategory | null
  image_url: string | null
  created_at: string
  creator: { name: string; photos: string[]; bio?: string; occupation?: string } | null
  participants: EventParticipant[]
}

export interface EventParticipant {
  id: string
  event_id: string
  user_id: string
  status: 'pending' | 'accepted' | 'declined'
  profile?: { name: string; photos: string[] }
}

export interface CreateEventInput {
  title: string
  description?: string
  location?: string
  latitude?: number
  longitude?: number
  event_date?: string
  max_participants?: number
  category?: EventCategory
}

export interface EventFilters {
  category?: EventCategory
  dateFrom?: string
  dateTo?: string
  query?: string
}
