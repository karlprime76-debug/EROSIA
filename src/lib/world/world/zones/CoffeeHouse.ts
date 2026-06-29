import type { ZoneDefinition, Teleporter, InteractionPoint } from '../../types'

const teleporters: Teleporter[] = [
  { id: 'coffee-to-garden', position: { x: 15, y: 0, z: 20 }, targetZone: 'garden', targetPosition: { x: -20, y: 0, z: 0 }, label: '→ Garden' },
  { id: 'coffee-to-sunset', position: { x: -12, y: 0, z: -18 }, targetZone: 'sunset-pier', targetPosition: { x: 10, y: 0, z: 20 }, label: '→ Sunset Pier' },
]

const interactions: InteractionPoint[] = [
  { id: 'coffee-counter', type: 'bar', position: { x: -3, y: 0, z: 5 }, rotation: 0, label: 'Comptoir', animation: 'standing', capacity: 4 },
  { id: 'coffee-sofa-1', type: 'sofa', position: { x: 8, y: 0, z: -2 }, rotation: -0.2, label: 'Canapé', animation: 'sitting', capacity: 3 },
  { id: 'coffee-sofa-2', type: 'sofa', position: { x: -8, y: 0, z: -4 }, rotation: 0.4, label: 'Fauteuil', animation: 'sitting', capacity: 2 },
  { id: 'coffee-bench', type: 'bench', position: { x: 12, y: 0, z: 8 }, rotation: 0.1, label: 'Banquette', animation: 'sitting', capacity: 2 },
]

export const CoffeeHouse: ZoneDefinition = {
  id: 'coffee-house',
  name: 'Coffee House',
  description: 'Café cosy pour discuter autour d\'un verre — musique acoustique, livres, plantes',
  center: { x: 0, y: 0, z: 0 },
  radius: 20,
  capacity: 30,
  ambientColor: '#3E2723',
  groundColor: '#5D4037',
  music: 'acoustic',
  objects: ['tables', 'chairs', 'counter', 'bookshelves', 'plants', 'lamps'],
  teleporters,
  interactions,
  spawnPoint: { x: 0, y: 0, z: 2 },
}
