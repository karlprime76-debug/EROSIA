import type { ZoneDefinition, Teleporter, InteractionPoint } from '../../types'

const teleporters: Teleporter[] = [
  { id: 'vip-to-rooftop', position: { x: 5, y: 0, z: -20 }, targetZone: 'rooftop-lounge', targetPosition: { x: 10, y: 0, z: 30 }, label: '→ Rooftop Lounge' },
  { id: 'vip-to-night', position: { x: -15, y: 0, z: 10 }, targetZone: 'night-club', targetPosition: { x: 10, y: 0, z: -25 }, label: '→ Night Club' },
]

const interactions: InteractionPoint[] = [
  { id: 'vip-bar', type: 'bar', position: { x: -5, y: 0, z: 5 }, rotation: 0, label: 'Bar VIP', animation: 'standing', capacity: 6 },
  { id: 'vip-sofa-1', type: 'sofa', position: { x: 10, y: 0, z: -3 }, rotation: -0.3, label: 'Canapé VIP', animation: 'sitting', capacity: 4 },
  { id: 'vip-sofa-2', type: 'sofa', position: { x: -10, y: 0, z: -5 }, rotation: 0.5, label: 'Canapé VIP', animation: 'sitting', capacity: 4 },
  { id: 'vip-bench', type: 'bench', position: { x: 0, y: 0, z: 12 }, rotation: 0, label: 'Banquette', animation: 'sitting', capacity: 3 },
]

export const VIPArea: ZoneDefinition = {
  id: 'vip-area',
  name: 'VIP Area',
  description: 'Espace privé premium avec accès exclusif et vue dégagée',
  center: { x: 0, y: 0, z: 0 },
  radius: 20,
  capacity: 20,
  ambientColor: '#FFD700',
  groundColor: '#1C1C1E',
  music: 'chill_electronic',
  objects: ['luxury_sofas', 'champagne_bar', 'chandelier', 'velvet_ropes', 'panoramic_view'],
  teleporters,
  interactions,
  spawnPoint: { x: 0, y: 0, z: 3 },
}
