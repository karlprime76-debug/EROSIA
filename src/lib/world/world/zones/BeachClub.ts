import type { ZoneDefinition, Teleporter, InteractionPoint } from '../../types'

const teleporters: Teleporter[] = [
  { id: 'beach-to-rooftop', position: { x: 40, y: 0, z: -20 }, targetZone: 'rooftop-lounge', targetPosition: { x: -30, y: 0, z: 10 }, label: '→ Rooftop Lounge' },
  { id: 'beach-to-sunset', position: { x: 60, y: 0, z: 10 }, targetZone: 'sunset-pier', targetPosition: { x: 0, y: 0, z: -15 }, label: '→ Sunset Pier' },
  { id: 'beach-to-garden', position: { x: -20, y: 0, z: 50 }, targetZone: 'garden', targetPosition: { x: 10, y: 0, z: -30 }, label: '→ Garden' },
]

const interactions: InteractionPoint[] = [
  { id: 'beach-bonfire', type: 'bonfire', position: { x: 5, y: 0, z: -8 }, rotation: 0, label: 'Feu de camp', animation: 'sitting', capacity: 8 },
  { id: 'beach-bar', type: 'bar', position: { x: -12, y: 0, z: 5 }, rotation: 0.5, label: 'Bar de la plage', animation: 'standing', capacity: 6 },
  { id: 'beach-sofa-1', type: 'sofa', position: { x: 8, y: 0, z: 15 }, rotation: -0.3, label: 'Canapé', animation: 'sitting', capacity: 3 },
  { id: 'beach-sofa-2', type: 'sofa', position: { x: -5, y: 0, z: 20 }, rotation: 0.2, label: 'Canapé', animation: 'sitting', capacity: 3 },
]

export const BeachClub: ZoneDefinition = {
  id: 'beach-club',
  name: 'Beach Club',
  description: 'Plage virtuelle au coucher du soleil avec vue sur l\'océan — vagues, palmiers, feu de camp',
  center: { x: 0, y: 0, z: 0 },
  radius: 50,
  capacity: 80,
  ambientColor: '#FF8C42',
  groundColor: '#F4D03F',
  music: 'ambient_ocean',
  objects: ['palm_trees', 'beach_chairs', 'bonfire', 'umbrellas', 'bar', 'tiki_torches'],
  teleporters,
  interactions,
  spawnPoint: { x: 0, y: 0, z: 5 },
}
