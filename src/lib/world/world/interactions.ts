import type { InteractionPoint, Vec3, ZoneId } from '../types'
import { getZone } from './zones'

export function getInteractionsForZone(zoneId: ZoneId): InteractionPoint[] {
  return getZone(zoneId)?.interactions ?? []
}

export function findInteractionAt(
  position: Vec3,
  zoneId: ZoneId,
  threshold = 3,
): InteractionPoint | null {
  const interactions = getInteractionsForZone(zoneId)
  return interactions.find(i => {
    const dx = position.x - i.position.x
    const dz = position.z - i.position.z
    return Math.sqrt(dx * dx + dz * dz) <= threshold
  }) ?? null
}

export function getAllInteractionTypes(): string[] {
  return ['bench', 'sofa', 'bar', 'pool', 'bonfire', 'pier', 'dancefloor']
}
