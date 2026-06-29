import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/realtime-js'
import { supabase as sbClient } from '@/lib/supabase/client'
import type { RoomPresence } from './types'

function supabase() {
  return sbClient
}

export interface RoomRealtimeCallbacks {
  onJoin?: (presence: RoomPresence) => void
  onLeave?: (presence: RoomPresence) => void
  onMove?: (presence: RoomPresence) => void
  onError?: (error: string) => void
}

export function subscribeRoomPresence(
  roomId: string,
  callbacks: RoomRealtimeCallbacks,
): { channel: RealtimeChannel; presenceChannel: RealtimeChannel } {
  const dbChannel = supabase()
    .channel(`room-db:${roomId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'room_presence',
      filter: `room_id=eq.${roomId}`,
    }, (payload: RealtimePostgresChangesPayload<RoomPresence>) => {
      callbacks.onJoin?.(payload.new as RoomPresence)
    })
    .on('postgres_changes', {
      event: 'DELETE',
      schema: 'public',
      table: 'room_presence',
      filter: `room_id=eq.${roomId}`,
    }, (payload: RealtimePostgresChangesPayload<RoomPresence>) => {
      callbacks.onLeave?.(payload.old as RoomPresence)
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'room_presence',
      filter: `room_id=eq.${roomId}`,
    }, (payload: RealtimePostgresChangesPayload<RoomPresence>) => {
      callbacks.onMove?.(payload.new as RoomPresence)
    })
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR' && err) callbacks.onError?.(err.message)
    })

  const presenceChannel = supabase()
    .channel(`presence:room:${roomId}`, {
      config: { presence: { key: roomId } },
    })
    .on('presence', { event: 'sync' }, () => {
      // Presence state sync available via presenceChannel.presenceState()
    })
    .subscribe()

  return { channel: dbChannel, presenceChannel }
}

export async function trackPresence(roomId: string): Promise<void> {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return

  const ch = supabase().channel(`presence:room:${roomId}`, {
    config: { presence: { key: roomId } },
  })

  ch.on('presence', { event: 'sync' }, () => {
    // Presence synced — state accessible via ch.presenceState()
  })

  ch.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await ch.track({ user_id: user.id, online_at: new Date().toISOString() })
    }
  })
}

export async function untrackPresence(roomId: string): Promise<void> {
  const ch = supabase().channel(`presence:room:${roomId}`)
  await ch.untrack()
  supabase().removeChannel(ch)
}

export function broadcastPosition(
  roomId: string,
  position: { x: number; y: number; z: number; rotation_y?: number; animation?: string },
  onError?: (err: string) => void,
): { channel: RealtimeChannel } {
  const ch = supabase()
    .channel(`broadcast:room:${roomId}`)

  ch.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      ch.send({
        type: 'broadcast',
        event: 'position',
        payload: position,
      })
    }
    if (status === 'CHANNEL_ERROR') onError?.('Erreur broadcast position')
  })

  return { channel: ch }
}

export function subscribePositionBroadcast(
  roomId: string,
  onPosition: (data: { x: number; y: number; z: number; rotation_y?: number; animation?: string; user_id: string }) => void,
  onError?: (err: string) => void,
): { channel: RealtimeChannel } {
  const ch = supabase()
    .channel(`broadcast:room:${roomId}`)
    .on('broadcast', { event: 'position' }, (payload) => {
      onPosition(payload.payload as Parameters<typeof onPosition>[0])
    })
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') onError?.('Erreur écoute position')
    })

  return { channel: ch }
}

export function cleanup(channels: (RealtimeChannel | undefined | null)[]): void {
  for (const ch of channels) {
    if (ch) {
      ch.unsubscribe()
      supabase().removeChannel(ch)
    }
  }
}
