import { supabase as sbClient } from '@/lib/supabase/client'
import type { EventItem, EventParticipant, CreateEventInput, EventFilters } from './types'

export type { EventItem, EventParticipant, CreateEventInput, EventFilters, EventCategory } from './types'
export { EVENT_CATEGORIES } from './types'

function supabase() {
  return sbClient
}

const PAGE_SIZE = 20

export async function createEvent(
  input: CreateEventInput,
  file?: File,
  onProgress?: (pct: number) => void,
): Promise<{ data: EventItem | null; error?: string }> {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  let image_url: string | null = null

  if (file) {
    onProgress?.(10)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const fileName = `events/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error: uploadError } = await supabase()
      .storage.from('event_images')
      .upload(fileName, file)

    if (uploadError) return { data: null, error: uploadError.message }
    onProgress?.(60)

    const { data: urlData } = supabase().storage.from('event_images').getPublicUrl(fileName)
    image_url = urlData.publicUrl
  }

  onProgress?.(80)

  const { data, error } = await supabase()
    .from('events')
    .insert({
      creator_id: user.id,
      title: input.title,
      description: input.description ?? null,
      location: input.location ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      event_date: input.event_date ?? null,
      max_participants: input.max_participants ?? null,
      category: input.category ?? null,
      image_url,
    })
    .select('*, creator:profiles!events_creator_id_fkey(name, photos), participants:event_participants(*)')
    .single()

  if (error) return { data: null, error: error.message }
  onProgress?.(100)

  return { data: data as EventItem | null }
}

export async function getEvents(
  filters?: EventFilters,
  page = 1,
): Promise<{ data: EventItem[]; error?: string }> {
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase()
    .from('events')
    .select('*, creator:profiles!events_creator_id_fkey(name, photos), participants:event_participants(*)', { count: 'exact' })

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  if (filters?.dateFrom) {
    query = query.gte('event_date', filters.dateFrom)
  }

  if (filters?.dateTo) {
    query = query.lte('event_date', filters.dateTo)
  }

  if (filters?.query) {
    const q = filters.query.replace(/[%_.(),]/g, '').trim()
    if (q) {
      query = query.or(`title.ilike.${q}%,description.ilike.${q}%,location.ilike.${q}%`)
    }
  }

  const { data, error } = await query
    .order('event_date', { ascending: true })
    .range(from, to)

  return { data: data as EventItem[] ?? [], error: error?.message }
}

export async function getEventById(eventId: string): Promise<{ data: EventItem | null; error?: string }> {
  const { data, error } = await supabase()
    .from('events')
    .select('*, creator:profiles!events_creator_id_fkey(id, name, photos, bio, occupation), participants:event_participants(*)')
    .eq('id', eventId)
    .maybeSingle()

  return { data: data as EventItem | null, error: error?.message }
}

export async function joinEvent(eventId: string): Promise<{ data: EventParticipant | null; error?: string }> {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase()
    .from('event_participants')
    .insert({ event_id: eventId, user_id: user.id, status: 'accepted' })
    .select()
    .single()

  return { data: data as EventParticipant | null, error: error?.message }
}

export async function leaveEvent(eventId: string): Promise<{ error?: string }> {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase()
    .from('event_participants')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', user.id)

  return { error: error?.message }
}

export async function getParticipants(eventId: string): Promise<{ data: EventParticipant[]; error?: string }> {
  const { data, error } = await supabase()
    .from('event_participants')
    .select('*, profile:profiles!event_participants_user_id_fkey(id, name, photos, bio)')
    .eq('event_id', eventId)
    .eq('status', 'accepted')
    .order('created_at', { ascending: true })

  return { data: data as EventParticipant[] ?? [], error: error?.message }
}

export async function deleteEvent(eventId: string): Promise<{ error?: string }> {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: event } = await supabase()
    .from('events')
    .select('creator_id, image_url')
    .eq('id', eventId)
    .maybeSingle()

  if (!event) return { error: 'Événement introuvable' }
  if (event.creator_id !== user.id) return { error: 'Non autorisé' }

  if (event.image_url) {
    const storagePath = event.image_url.split('/event_images/').pop()
    if (storagePath) {
      await supabase().storage.from('event_images').remove([`event_images/${storagePath}`])
    }
  }

  const { error } = await supabase().from('events').delete().eq('id', eventId)

  return { error: error?.message }
}
