import type { ZoneId, Teleporter, Vec3 } from '../types'
import { getZone } from './zones'
import { getAllZones } from './zones'

export function getAllTeleporters(): Teleporter[] {
  return getAllZones().flatMap(z => z.teleporters)
}

export function getTeleportersForZone(zoneId: ZoneId): Teleporter[] {
  const zone = getZone(zoneId)
  return zone?.teleporters ?? []
}

export function findTeleporterAt(position: Vec3, zoneId: ZoneId, threshold = 3): Teleporter | null {
  const zone = getZone(zoneId)
  if (!zone) return null
  return zone.teleporters.find(t => {
    const dx = position.x - t.position.x
    const dz = position.z - t.position.z
    return Math.sqrt(dx * dx + dz * dz) <= threshold
  }) ?? null
}

export function teleport(
  currentZone: ZoneId,
  teleporterId: string,
): { targetZone: ZoneId; targetPosition: Vec3 } | null {
  const zone = getZone(currentZone)
  if (!zone) return null
  const t = zone.teleporters.find(tp => tp.id === teleporterId)
  if (!t) return null
  return { targetZone: t.targetZone, targetPosition: t.targetPosition }
}
