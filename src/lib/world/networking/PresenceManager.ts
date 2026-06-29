import type { RemoteAvatarData, AvatarState, AvatarPreset, Vec3, ZoneId } from '../types'

export interface PresenceUpdate {
  userId: string
  position: Vec3
  rotation: number
  animation: string
  zoneId: ZoneId | null
  timestamp: number
}

export function createPresencePayload(
  userId: string,
  state: AvatarState,
  preset: AvatarPreset,
): RemoteAvatarData {
  return {
    userId,
    position: state.position,
    rotation: state.rotation,
    animation: state.animation,
    zoneId: state.zoneId,
    preset,
    lastUpdate: Date.now(),
  }
}

export function interpolatePosition(
  from: Vec3,
  to: Vec3,
  alpha: number,
): Vec3 {
  return {
    x: from.x + (to.x - from.x) * alpha,
    y: from.y + (to.y - from.y) * alpha,
    z: from.z + (to.z - from.z) * alpha,
  }
}

export function isPresenceStale(presence: RemoteAvatarData, maxAge = 10000): boolean {
  return Date.now() - presence.lastUpdate > maxAge
}

export function computeDistance(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}
