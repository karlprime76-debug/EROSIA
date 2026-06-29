import { supabase as sbClient } from '@/lib/supabase/client'

export interface SocialSpace {
  id: string
  name: string
  type: 'beach' | 'rooftop' | 'lounge' | 'garden' | 'coffee'
  description: string | null
  capacity: number
  metadata: Record<string, unknown>
  created_at: string
}

export interface SpacePresence {
  id: string
  user_id: string
  space_id: string
  x: number
  y: number
  z: number
  rotation_y: number
  animation: string
  entered_at: string
  last_active_at: string
  profile?: {
    id: string
    name: string
    photos: string[]
    is_verified: boolean
  }
}

export interface PresenceWithProfile extends SpacePresence {
  profile: {
    id: string
    name: string
    photos: string[]
    is_verified: boolean
  }
}

function supabase() {
  return sbClient
}

export async function getSpaces(): Promise<{ data: SocialSpace[] | null; error?: string }> {
  const { data, error } = await supabase()
    .from('social_spaces')
    .select('*')
    .order('name')

  return { data: data as SocialSpace[] | null, error: error?.message }
}

export async function getMyPresence(): Promise<{ data: SpacePresence | null; error?: string }> {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase()
    .from('space_presence')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return { data: data as SpacePresence | null, error: error?.message }
}

export async function joinSpace(spaceId: string, x?: number, y?: number, z?: number): Promise<{ data: SpacePresence | null; error?: string }> {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data: space } = await supabase()
    .from('social_spaces')
    .select('capacity')
    .eq('id', spaceId)
    .maybeSingle()

  if (!space) return { data: null, error: 'Espace introuvable' }

  const { count } = await supabase()
    .from('space_presence')
    .select('*', { count: 'exact', head: true })
    .eq('space_id', spaceId)
    .gte('last_active_at', new Date(Date.now() - 60000).toISOString())

  if ((count ?? 0) >= space.capacity) return { data: null, error: 'Espace complet' }

  const spawn = (x !== undefined && y !== undefined && z !== undefined)
    ? { x, y, z }
    : { x: 0, y: 0, z: 0 }

  const { data, error } = await supabase()
    .from('space_presence')
    .upsert({
      user_id: user.id,
      space_id: spaceId,
      ...spawn,
      rotation_y: 0,
      animation: 'idle',
      last_active_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .maybeSingle()

  return { data: data as SpacePresence | null, error: error?.message }
}

export async function leaveSpace(): Promise<{ error?: string }> {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase()
    .from('space_presence')
    .delete()
    .eq('user_id', user.id)

  return { error: error?.message }
}

export async function updatePosition(x: number, y: number, z: number, rotationY?: number, animation?: string): Promise<{ error?: string }> {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const updates: Record<string, unknown> = {
    x, y, z,
    last_active_at: new Date().toISOString(),
  }
  if (rotationY !== undefined) updates.rotation_y = rotationY
  if (animation !== undefined) updates.animation = animation

  const { error } = await supabase()
    .from('space_presence')
    .update(updates)
    .eq('user_id', user.id)

  return { error: error?.message }
}

export async function getPresence(spaceId: string): Promise<{ data: PresenceWithProfile[] | null; error?: string }> {
  const { data, error } = await supabase()
    .from('space_presence')
    .select(`
      *,
      profile:profiles!space_presence_user_id_fkey(id, name, photos, is_verified)
    `)
    .eq('space_id', spaceId)
    .gte('last_active_at', new Date(Date.now() - 60000).toISOString())
    .order('entered_at', { ascending: true })

  return { data: data as PresenceWithProfile[] | null, error: error?.message }
}
