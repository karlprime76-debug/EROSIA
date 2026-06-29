import type { ZoneId, ZoneDefinition } from '../../types'
import { BeachClub } from './BeachClub'
import { RooftopLounge } from './RooftopLounge'
import { CoffeeHouse } from './CoffeeHouse'
import { NightClub } from './NightClub'
import { Garden } from './Garden'
import { VIPArea } from './VIPArea'
import { SunsetPier } from './SunsetPier'

const ZONES: Record<ZoneId, ZoneDefinition> = {
  'beach-club': BeachClub,
  'rooftop-lounge': RooftopLounge,
  'coffee-house': CoffeeHouse,
  'night-club': NightClub,
  garden: Garden,
  'vip-area': VIPArea,
  'sunset-pier': SunsetPier,
}

export const ZONE_LIST: ZoneDefinition[] = Object.values(ZONES)

export function getZone(id: ZoneId): ZoneDefinition | undefined {
  return ZONES[id]
}

export function getZoneByName(name: string): ZoneDefinition | undefined {
  return ZONE_LIST.find(z => z.name.toLowerCase() === name.toLowerCase())
}

export function getAllZones(): ZoneDefinition[] {
  return ZONE_LIST
}

export function isInZone(position: { x: number; z: number }, zoneId: ZoneId): boolean {
  const zone = ZONES[zoneId]
  if (!zone) return false
  const dx = position.x - zone.center.x
  const dz = position.z - zone.center.z
  return Math.sqrt(dx * dx + dz * dz) <= zone.radius
}

export function findZoneAt(position: { x: number; z: number }): ZoneId | null {
  for (const zone of ZONE_LIST) {
    if (isInZone(position, zone.id)) return zone.id
  }
  return null
}

export function getZoneConnections(zoneId: ZoneId): ZoneId[] {
  const zone = ZONES[zoneId]
  if (!zone) return []
  return zone.teleporters.map(t => t.targetZone)
}
