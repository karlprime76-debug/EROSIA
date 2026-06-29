import type { ZoneDefinition, Teleporter, InteractionPoint } from '../../types'

const teleporters: Teleporter[] = [
  { id: 'rooftop-to-beach', position: { x: -30, y: 0, z: 15 }, targetZone: 'beach-club', targetPosition: { x: 40, y: 0, z: -20 }, label: '→ Beach Club' },
  { id: 'rooftop-to-night', position: { x: 25, y: 0, z: -10 }, targetZone: 'night-club', targetPosition: { x: -20, y: 0, z: 15 }, label: '→ Night Club' },
  { id: 'rooftop-to-vip', position: { x: 10, y: 0, z: 30 }, targetZone: 'vip-area', targetPosition: { x: 0, y: 0, z: -20 }, label: '→ VIP Area' },
]

const interactions: InteractionPoint[] = [
  { id: 'rooftop-bar', type: 'bar', position: { x: -5, y: 0, z: 8 }, rotation: 0, label: 'Bar panoramique', animation: 'standing', capacity: 8 },
  { id: 'rooftop-sofa-1', type: 'sofa', position: { x: 10, y: 0, z: -5 }, rotation: -0.5, label: 'Canapé lounge', animation: 'sitting', capacity: 4 },
  { id: 'rooftop-sofa-2', type: 'sofa', position: { x: -15, y: 0, z: -2 }, rotation: 0.8, label: 'Canapé lounge', animation: 'sitting', capacity: 4 },
  { id: 'rooftop-bench', type: 'bench', position: { x: 20, y: 0, z: 5 }, rotation: 0.3, label: 'Banquette vue ville', animation: 'sitting', capacity: 2 },
]

export const RooftopLounge: ZoneDefinition = {
  id: 'rooftop-lounge',
  name: 'Rooftop Lounge',
  description: 'Rooftop chic avec vue panoramique sur la ville — sofas, bar, lumières tamisées',
  center: { x: 0, y: 0, z: 0 },
  radius: 35,
  capacity: 60,
  ambientColor: '#1A1A2E',
  groundColor: '#0F3460',
  music: 'chill_lofi',
  objects: ['sofas', 'bar', 'string_lights', 'city_skyline', 'plants'],
  teleporters,
  interactions,
  spawnPoint: { x: 0, y: 0, z: 3 },
}
