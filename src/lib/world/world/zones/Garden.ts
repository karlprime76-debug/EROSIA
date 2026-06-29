import type { ZoneDefinition, Teleporter, InteractionPoint } from '../../types'

const teleporters: Teleporter[] = [
  { id: 'garden-to-beach', position: { x: 15, y: 0, z: -30 }, targetZone: 'beach-club', targetPosition: { x: -20, y: 0, z: 50 }, label: '→ Beach Club' },
  { id: 'garden-to-coffee', position: { x: -20, y: 0, z: 5 }, targetZone: 'coffee-house', targetPosition: { x: 15, y: 0, z: 20 }, label: '→ Coffee House' },
  { id: 'garden-to-night', position: { x: 20, y: 0, z: 25 }, targetZone: 'night-club', targetPosition: { x: 25, y: 0, z: -5 }, label: '→ Night Club' },
]

const interactions: InteractionPoint[] = [
  { id: 'garden-bench-1', type: 'bench', position: { x: -5, y: 0, z: 8 }, rotation: 0.2, label: 'Banc jardin', animation: 'sitting', capacity: 2 },
  { id: 'garden-bench-2', type: 'bench', position: { x: 10, y: 0, z: -5 }, rotation: -0.1, label: 'Banc ombragé', animation: 'sitting', capacity: 2 },
  { id: 'garden-sofa', type: 'sofa', position: { x: -8, y: 0, z: -10 }, rotation: 0.6, label: 'Coin détente', animation: 'sitting', capacity: 3 },
  { id: 'garden-pool', type: 'pool', position: { x: 0, y: 0, z: -15 }, rotation: 0, label: 'Piscine', animation: 'floating', capacity: 10 },
]

export const Garden: ZoneDefinition = {
  id: 'garden',
  name: 'Garden',
  description: 'Jardin zen avec piscine, bancs et espaces verts — calme et verdure',
  center: { x: 0, y: 0, z: 0 },
  radius: 35,
  capacity: 40,
  ambientColor: '#1B5E20',
  groundColor: '#2E7D32',
  music: 'nature',
  objects: ['trees', 'flowers', 'pool', 'benches', 'fountain', 'hedges', 'lanterns'],
  teleporters,
  interactions,
  spawnPoint: { x: 0, y: 0, z: 5 },
}
