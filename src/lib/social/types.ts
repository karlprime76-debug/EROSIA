export type RoomType = 'beach' | 'lounge' | 'rooftop' | 'festival' | 'coffee'

export interface Room {
  id: string
  name: string
  type: RoomType
  description: string | null
  capacity: number
  metadata: Record<string, unknown>
  created_at: string
}

export type Animation = 'idle' | 'walking' | 'standing' | 'sitting' | 'dancing' | 'waving' | 'floating'

export interface Position {
  x: number
  y: number
  z: number
  rotation_y?: number
  animation?: Animation
}

export interface RoomPresence {
  id: string
  user_id: string
  room_id: string
  x: number
  y: number
  z: number
  rotation_y: number
  animation: Animation
  entered_at: string
  last_active_at: string
  profile?: {
    id: string
    name: string
    photos: string[]
    is_verified: boolean
  }
}

export interface PresenceWithProfile extends RoomPresence {
  profile: {
    id: string
    name: string
    photos: string[]
    is_verified: boolean
  }
}

export interface RoomRealtimeEvent {
  type: 'join' | 'leave' | 'move'
  presence: RoomPresence
}
