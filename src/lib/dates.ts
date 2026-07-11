import { supabase } from '@/lib/supabase/client'

export interface DateSlot {
  id: string
  proposed_date: string
  proposed_time: string
  accepted: boolean
}

export interface PlannedDate {
  id: string
  match_id: string
  proposer_id: string
  proposee_id: string
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'rescheduled' | 'completed' | 'confirmed'
  category: 'restaurant' | 'cafe' | 'cinema' | 'bar' | 'walk' | 'hotel' | 'other'
  location: string | null
  note: string | null
  cancelled_by: string | null
  cancel_reason: string | null
  confirmed_at: string | null
  completed_at: string | null
  slots: DateSlot[]
  match_user_id: string
  match_user_name: string
  match_user_photo: string | null
  created_at: string
}

export interface ProposeDateInput {
  matchId: string
  category: PlannedDate['category']
  slots: { proposed_date: string; proposed_time: string }[]
  location?: string
  note?: string
}

export async function getUpcomingDates(): Promise<{ data: PlannedDate[] | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Non authentifié' }
    const { data, error } = await supabase.rpc('get_upcoming_dates', { p_user_id: user.id })
    if (error) return { data: null, error: error.message }
    return { data: data as unknown as PlannedDate[], error: null }
  } catch {
    return { data: null, error: 'Erreur réseau' }
  }
}

export async function getDateHistory(page = 1): Promise<{ data: PlannedDate[] | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Non authentifié' }
    const from = (page - 1) * 20
    const to = from + 19
    const { data: dates, error } = await supabase
      .from('planned_dates')
      .select('*, date_slots(*)')
      .or(`proposer_id.eq.${user.id},proposee_id.eq.${user.id}`)
      .in('status', ['declined', 'cancelled', 'completed'])
      .order('updated_at', { ascending: false })
      .range(from, to)
    if (error) return { data: null, error: error.message }
    return { data: dates as unknown as PlannedDate[], error: null }
  } catch {
    return { data: null, error: 'Erreur réseau' }
  }
}

export async function proposeDate(input: ProposeDateInput): Promise<{ data: PlannedDate | null; error: string | null }> {
  try {
    const res = await fetch('/api/dates/propose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error ?? 'Erreur' }
    return { data: json.data, error: null }
  } catch {
    return { data: null, error: 'Erreur réseau' }
  }
}

export async function respondToDate(dateId: string, accept: boolean, slotId?: string): Promise<{ error: string | null }> {
  try {
    const res = await fetch(`/api/dates/${dateId}/respond`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept, slotId }),
    })
    const json = await res.json()
    if (!res.ok) return { error: json.error ?? 'Erreur' }
    return { error: null }
  } catch {
    return { error: 'Erreur réseau' }
  }
}

export async function cancelDate(dateId: string, reason?: string): Promise<{ error: string | null }> {
  try {
    const res = await fetch(`/api/dates/${dateId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    const json = await res.json()
    if (!res.ok) return { error: json.error ?? 'Erreur' }
    return { error: null }
  } catch {
    return { error: 'Erreur réseau' }
  }
}

export async function confirmDate(dateId: string): Promise<{ error: string | null }> {
  try {
    const res = await fetch(`/api/dates/${dateId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const json = await res.json()
    if (!res.ok) return { error: json.error ?? 'Erreur' }
    return { error: null }
  } catch {
    return { error: 'Erreur réseau' }
  }
}
