import type { LODLevel, MobileConfig } from '../types'

export const LOD_LEVELS: LODLevel[] = [
  { distance: 0, detail: 'high', polygonScale: 1.0, textureQuality: 1.0 },
  { distance: 30, detail: 'medium', polygonScale: 0.5, textureQuality: 0.7 },
  { distance: 80, detail: 'low', polygonScale: 0.25, textureQuality: 0.4 },
  { distance: 150, detail: 'culled', polygonScale: 0, textureQuality: 0 },
]

export function getLODLevel(distance: number, mobile?: MobileConfig): LODLevel {
  const adjusted = mobile
    ? LOD_LEVELS.map(l => ({ ...l, distance: l.distance * 0.6 }))
    : LOD_LEVELS

  for (let i = adjusted.length - 1; i >= 0; i--) {
    if (distance >= adjusted[i].distance) return adjusted[i]
  }
  return adjusted[0]
}

export function shouldCull(distance: number, mobile?: MobileConfig): boolean {
  return getLODLevel(distance, mobile).detail === 'culled'
}
