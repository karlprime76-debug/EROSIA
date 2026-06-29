import type { Vec3, ZoneId } from '../types'

export interface SceneObject {
  id: string
  type: string
  position: Vec3
  rotation: Vec3
  scale: Vec3
  visible: boolean
  metadata: Record<string, unknown>
}

export interface SceneGroup {
  id: string
  zoneId: ZoneId
  objects: SceneObject[]
  active: boolean
}

export function createSceneGroup(zoneId: ZoneId, id?: string): SceneGroup {
  return {
    id: id ?? `group-${zoneId}-${Date.now()}`,
    zoneId,
    objects: [],
    active: false,
  }
}

export function setGroupVisibility(group: SceneGroup, visible: boolean): SceneGroup {
  return { ...group, active: visible, objects: group.objects.map(o => ({ ...o, visible })) }
}
