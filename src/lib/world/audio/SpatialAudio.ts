import type { SpatialAudioSource, Vec3, ZoneId } from '../types'
import { getZone } from '../world'

export const AUDIO_ZONES: Record<string, Omit<SpatialAudioSource, 'id'>> = {
  'beach-waves': { url: '/audio/ambient/ocean-waves.mp3', position: { x: 0, y: 0, z: -30 }, volume: 0.6, playbackRate: 1, loop: true, spatialBlend: 1 },
  'beach-music': { url: '/audio/music/beach-chill.mp3', position: { x: -10, y: 2, z: 5 }, volume: 0.4, playbackRate: 1, loop: true, spatialBlend: 0.8 },
  'rooftop-music': { url: '/audio/music/lofi-chill.mp3', position: { x: 0, y: 5, z: 0 }, volume: 0.5, playbackRate: 1, loop: true, spatialBlend: 0.7 },
  'coffee-ambient': { url: '/audio/ambient/cafe.mp3', position: { x: 0, y: 1, z: 0 }, volume: 0.3, playbackRate: 1, loop: true, spatialBlend: 0.6 },
  'night-music': { url: '/audio/music/electronic.mp3', position: { x: 0, y: 3, z: 0 }, volume: 0.7, playbackRate: 1, loop: true, spatialBlend: 0.5 },
  'garden-birds': { url: '/audio/ambient/birds.mp3', position: { x: 5, y: 3, z: -5 }, volume: 0.3, playbackRate: 1, loop: true, spatialBlend: 1 },
  'garden-water': { url: '/audio/ambient/fountain.mp3', position: { x: 0, y: 0, z: -10 }, volume: 0.4, playbackRate: 1, loop: true, spatialBlend: 1 },
  'vip-music': { url: '/audio/music/chill-electronic.mp3', position: { x: 0, y: 2, z: 0 }, volume: 0.4, playbackRate: 1, loop: true, spatialBlend: 0.6 },
  'sunset-ambient': { url: '/audio/ambient/sunset.mp3', position: { x: 0, y: 1, z: -15 }, volume: 0.4, playbackRate: 1, loop: true, spatialBlend: 0.9 },
  'wind-ambient': { url: '/audio/ambient/wind.mp3', position: { x: 0, y: 10, z: 0 }, volume: 0.2, playbackRate: 1, loop: true, spatialBlend: 0.3 },
}

export function getAudioSourcesForZone(zoneId: ZoneId): SpatialAudioSource[] {
  const zone = getZone(zoneId)
  if (!zone) return []

  const sources: SpatialAudioSource[] = []

  // Always add wind ambient
  sources.push({ id: 'wind', ...AUDIO_ZONES['wind-ambient'] })

  // Add zone-specific sources
  switch (zoneId) {
    case 'beach-club':
      sources.push({ id: 'beach-waves', ...AUDIO_ZONES['beach-waves'] })
      sources.push({ id: 'beach-music', ...AUDIO_ZONES['beach-music'] })
      break
    case 'rooftop-lounge':
      sources.push({ id: 'rooftop-music', ...AUDIO_ZONES['rooftop-music'] })
      break
    case 'coffee-house':
      sources.push({ id: 'coffee-ambient', ...AUDIO_ZONES['coffee-ambient'] })
      break
    case 'night-club':
      sources.push({ id: 'night-music', ...AUDIO_ZONES['night-music'] })
      break
    case 'garden':
      sources.push({ id: 'garden-birds', ...AUDIO_ZONES['garden-birds'] })
      sources.push({ id: 'garden-water', ...AUDIO_ZONES['garden-water'] })
      break
    case 'vip-area':
      sources.push({ id: 'vip-music', ...AUDIO_ZONES['vip-music'] })
      break
    case 'sunset-pier':
      sources.push({ id: 'sunset-ambient', ...AUDIO_ZONES['sunset-ambient'] })
      break
  }

  return sources
}

export function computeAudioVolume(
  listenerPos: Vec3,
  sourcePos: Vec3,
  maxDistance: number,
  baseVolume: number,
): number {
  const dx = listenerPos.x - sourcePos.x
  const dy = listenerPos.y - sourcePos.y
  const dz = listenerPos.z - sourcePos.z
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

  if (dist >= maxDistance) return 0
  const factor = 1 - dist / maxDistance
  return baseVolume * factor * factor // inverse square falloff
}
