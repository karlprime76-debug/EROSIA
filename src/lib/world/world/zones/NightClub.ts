import type { ZoneDefinition, Teleporter, InteractionPoint } from '../../types'

const teleporters: Teleporter[] = [
  { id: 'night-to-rooftop', position: { x: -20, y: 0, z: 20 }, targetZone: 'rooftop-lounge', targetPosition: { x: 25, y: 0, z: -10 }, label: '→ Rooftop Lounge' },
  { id: 'night-to-garden', position: { x: 25, y: 0, z: -5 }, targetZone: 'garden', targetPosition: { x: 15, y: 0, z: 20 }, label: '→ Garden' },
  { id: 'night-to-vip', position: { x: 10, y: 0, z: -25 }, targetZone: 'vip-area', targetPosition: { x: -15, y: 0, z: 5 }, label: '→ VIP Area' },
]

const interactions: InteractionPoint[] = [
  { id: 'night-dancefloor', type: 'dancefloor', position: { x: 0, y: 0, z: 0 }, rotation: 0, label: 'Dancefloor', animation: 'dancing', capacity: 30 },
  { id: 'night-bar', type: 'bar', position: { x: -15, y: 0, z: 8 }, rotation: 0.8, label: 'Bar', animation: 'standing', capacity: 10 },
  { id: 'night-sofa-1', type: 'sofa', position: { x: 18, y: 0, z: -5 }, rotation: -0.5, label: 'Coin VIP', animation: 'sitting', capacity: 4 },
  { id: 'night-sofa-2', type: 'sofa', position: { x: -10, y: 0, z: -15 }, rotation: 0.3, label: 'Canapé', animation: 'sitting', capacity: 3 },
]

export const NightClub: ZoneDefinition = {
  id: 'night-club',
  name: 'Night Club',
  description: 'Club électro avec scène, dancefloor et jeux de lumières',
  center: { x: 0, y: 0, z: 0 },
  radius: 30,
  capacity: 100,
  ambientColor: '#1A0A2E',
  groundColor: '#2D1B69',
  music: 'electronic',
  objects: ['stage', 'dancefloor', 'lighting_rig', 'speakers', 'bar', 'vip_booths'],
  teleporters,
  interactions,
  spawnPoint: { x: 0, y: 0, z: 10 },
}
