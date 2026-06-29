import type { AssetManifest, ZoneId, LODLevel } from '../types'

export interface AssetQueueItem {
  manifest: AssetManifest
  priority: number
  status: 'pending' | 'loading' | 'loaded' | 'error'
}

const ASSET_PRIORITY: Record<string, number> = {
  model: 3,
  texture: 2,
  audio: 1,
  animation: 2,
}

export function createAssetManifest(
  id: string,
  url: string,
  type: AssetManifest['type'],
  size: number,
  dependencies: string[] = [],
): AssetManifest {
  return { id, url, type, size, dependencies, lodLevels: ['high', 'medium', 'low'] }
}

export function createAssetQueue(manifests: AssetManifest[]): AssetQueueItem[] {
  return manifests.map(m => ({
    manifest: m,
    priority: ASSET_PRIORITY[m.type] ?? 1,
    status: 'pending' as const,
  })).sort((a, b) => b.priority - a.priority)
}

export function getVisibleAssets(
  zoneIds: ZoneId[],
  lodLevel: LODLevel,
): AssetManifest[] {
  // Return zone-level assets based on current LOD
  return zoneIds.flatMap(zoneId => [
    createAssetManifest(`${zoneId}-terrain`, `/models/world/${zoneId}/terrain.glb`, 'model', 1024 * 1024),
    createAssetManifest(`${zoneId}-objects`, `/models/world/${zoneId}/objects.glb`, 'model', 512 * 1024),
    createAssetManifest(`${zoneId}-textures`, `/textures/world/${zoneId}.webp`, 'texture', 256 * 1024),
  ]).filter(a => {
    if (lodLevel.detail === 'culled') return false
    if (lodLevel.detail === 'low') return a.type === 'model'
    return true
  })
}
