import { supabase as sbClient } from '@/lib/supabase/client'
import type { Room, RoomPresence, PresenceWithProfile, Position, Animation } from './types'

export type { Room, RoomPresence, PresenceWithProfile, Position, Animation, RoomType, RoomRealtimeEvent } from './types'

const ACTIVE_WINDOW_MS = 60000

function supabase() {
  return sbClient
}

export async function getRooms(): Promise<{ data: Room[]; error?: string }> {
  const { data, error } = await supabase()
    .from('rooms')
    .select('*')
    .order('name')

  return { data: data as Room[] ?? [], error: error?.message }
}

export async function getRoomById(roomId: string): Promise<{ data: Room | null; error?: string }> {
  const { data, error } = await supabase()
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .maybeSingle()

  return { data: data as Room | null, error: error?.message }
}

export async function getMyPresence(): Promise<{ data: RoomPresence | null; error?: string }> {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase()
    .from('room_presence')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return { data: data as RoomPresence | null, error: error?.message }
}

export async function joinRoom(
  roomId: string,
  position?: Position,
): Promise<{ data: RoomPresence | null; error?: string }> {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data: room } = await supabase()
    .from('rooms')
    .select('capacity')
    .eq('id', roomId)
    .maybeSingle()

  if (!room) return { data: null, error: 'Salon introuvable' }

  const { count } = await supabase()
    .from('room_presence')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId)
    .gte('last_active_at', new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString())

  if ((count ?? 0) >= room.capacity) return { data: null, error: 'Salon complet' }

  const spawn = position ?? { x: 0, y: 0, z: 0 }

  const { data, error } = await supabase()
    .from('room_presence')
    .upsert({
      user_id: user.id,
      room_id: roomId,
      x: spawn.x,
      y: spawn.y,
      z: spawn.z,
      rotation_y: spawn.rotation_y ?? 0,
      animation: spawn.animation ?? 'idle',
      last_active_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .maybeSingle()

  return { data: data as RoomPresence | null, error: error?.message }
}

export async function leaveRoom(): Promise<{ error?: string }> {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase()
    .from('room_presence')
    .delete()
    .eq('user_id', user.id)

  return { error: error?.message }
}

export async function updatePosition(
  x: number,
  y: number,
  z: number,
  rotationY?: number,
  animation?: Animation,
): Promise<{ error?: string }> {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const updates: Record<string, unknown> = {
    x, y, z,
    last_active_at: new Date().toISOString(),
  }
  if (rotationY !== undefined) updates.rotation_y = rotationY
  if (animation !== undefined) updates.animation = animation

  const { error } = await supabase()
    .from('room_presence')
    .update(updates)
    .eq('user_id', user.id)

  return { error: error?.message }
}

export async function getPresence(roomId: string): Promise<{ data: PresenceWithProfile[]; error?: string }> {
  const { data, error } = await supabase()
    .from('room_presence')
    .select(`
      *,
      profile:profiles!room_presence_user_id_fkey(id, name, photos, is_verified)
    `)
    .eq('room_id', roomId)
    .gte('last_active_at', new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString())
    .order('entered_at', { ascending: true })

  return { data: data as PresenceWithProfile[] ?? [], error: error?.message }
}
