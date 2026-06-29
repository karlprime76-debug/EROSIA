import type { ZoneDefinition, Teleporter, InteractionPoint } from '../../types'

const teleporters: Teleporter[] = [
  { id: 'sunset-to-beach', position: { x: -5, y: 0, z: -15 }, targetZone: 'beach-club', targetPosition: { x: 60, y: 0, z: 10 }, label: '→ Beach Club' },
  { id: 'sunset-to-coffee', position: { x: 15, y: 0, z: 20 }, targetZone: 'coffee-house', targetPosition: { x: -12, y: 0, z: -18 }, label: '→ Coffee House' },
]

const interactions: InteractionPoint[] = [
  { id: 'sunset-pier-end', type: 'pier', position: { x: 0, y: 0, z: -20 }, rotation: 0, label: 'Ponton — vue coucher', animation: 'standing', capacity: 6 },
  { id: 'sunset-bench-1', type: 'bench', position: { x: 8, y: 0, z: 5 }, rotation: 0.5, label: 'Banc vue mer', animation: 'sitting', capacity: 2 },
  { id: 'sunset-bench-2', type: 'bench', position: { x: -8, y: 0, z: 8 }, rotation: -0.3, label: 'Banc coucher du soleil', animation: 'sitting', capacity: 2 },
  { id: 'sunset-bonfire', type: 'bonfire', position: { x: 10, y: 0, z: -5 }, rotation: 0, label: 'Feu de plage', animation: 'sitting', capacity: 6 },
]

export const SunsetPier: ZoneDefinition = {
  id: 'sunset-pier',
  name: 'Sunset Pier',
  description: 'Ponton de bois au coucher du soleil — vue imprenable sur l\'horizon',
  center: { x: 0, y: 0, z: 0 },
  radius: 25,
  capacity: 30,
  ambientColor: '#FF6B35',
  groundColor: '#8B6914',
  music: 'acoustic_guitar',
  objects: ['pier', 'fishing_rods', 'lanterns', 'benches', 'telescope'],
  teleporters,
  interactions,
  spawnPoint: { x: 0, y: 0, z: 5 },
}
