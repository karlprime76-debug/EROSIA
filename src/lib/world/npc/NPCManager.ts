import type { Vec3, ZoneId, AvatarAnimation } from '../types'

export interface NPCDefinition {
  id: string
  name: string
  zoneId: ZoneId
  position: Vec3
  rotation: number
  animation: AvatarAnimation
  outfit: string
  dialogue?: string
}

const NPC_TEMPLATES: Omit<NPCDefinition, 'id'>[] = [
  { name: 'Diego', zoneId: 'beach-club', position: { x: 8, y: 0, z: 12 }, rotation: -0.5, animation: 'sitting', outfit: 'beach', dialogue: 'Belle journée pour une baignade !' },
  { name: 'Sofia', zoneId: 'beach-club', position: { x: -10, y: 0, z: -5 }, rotation: 0.8, animation: 'idle', outfit: 'beach', dialogue: 'Tu as vu le coucher de soleil ?' },
  { name: 'Marcus', zoneId: 'rooftop-lounge', position: { x: 12, y: 0, z: -3 }, rotation: -0.2, animation: 'sitting', outfit: 'chic', dialogue: 'La vue est incroyable ici.' },
  { name: 'Lena', zoneId: 'rooftop-lounge', position: { x: -8, y: 0, z: 6 }, rotation: 0.3, animation: 'idle', outfit: 'chic', dialogue: 'Tu viens souvent ?' },
  { name: 'Carlos', zoneId: 'coffee-house', position: { x: 5, y: 0, z: -3 }, rotation: -0.1, animation: 'sitting', outfit: 'casual', dialogue: 'Le café ici est excellent.' },
  { name: 'Emma', zoneId: 'coffee-house', position: { x: -6, y: 0, z: 4 }, rotation: 0.6, animation: 'sitting', outfit: 'casual', dialogue: 'J\'adore cet endroit pour lire.' },
  { name: 'Zara', zoneId: 'night-club', position: { x: 3, y: 0, z: 2 }, rotation: 0, animation: 'dancing', outfit: 'party', dialogue: 'Viens danser avec nous !' },
  { name: 'Leo', zoneId: 'night-club', position: { x: -5, y: 0, z: 8 }, rotation: -0.4, animation: 'idle', outfit: 'party', dialogue: 'Le DJ déchire ce soir !' },
  { name: 'Yuki', zoneId: 'garden', position: { x: -3, y: 0, z: 5 }, rotation: 0.2, animation: 'sitting', outfit: 'casual', dialogue: 'Le calme du jardin est apaisant.' },
  { name: 'Amara', zoneId: 'garden', position: { x: 7, y: 0, z: -8 }, rotation: -0.3, animation: 'walking', outfit: 'casual', dialogue: 'Les fleurs sont magnifiques.' },
  { name: 'James', zoneId: 'vip-area', position: { x: 5, y: 0, z: -2 }, rotation: 0.1, animation: 'sitting', outfit: 'premium', dialogue: 'Le service ici est impeccable.' },
  { name: 'Nina', zoneId: 'vip-area', position: { x: -4, y: 0, z: 6 }, rotation: -0.5, animation: 'idle', outfit: 'premium', dialogue: 'Bienvenue dans l\'espace VIP.' },
  { name: 'Kai', zoneId: 'sunset-pier', position: { x: 2, y: 0, z: -12 }, rotation: 0, animation: 'idle', outfit: 'casual', dialogue: 'Le coucher de soleil est magique...' },
  { name: 'Maya', zoneId: 'sunset-pier', position: { x: -6, y: 0, z: 3 }, rotation: 0.7, animation: 'sitting', outfit: 'casual', dialogue: 'J\'adore regarder les étoiles d\'ici.' },
]

export function generateNPCs(): NPCDefinition[] {
  return NPC_TEMPLATES.map((t, i) => ({
    ...t,
    id: `npc-${i + 1}`,
  }))
}

export function getNPCsByZone(zoneId: ZoneId): NPCDefinition[] {
  return NPC_TEMPLATES.filter(n => n.zoneId === zoneId).map((t, i) => ({
    ...t,
    id: `npc-${zoneId}-${i + 1}`,
  }))
}

export function getNPCById(id: string): NPCDefinition | undefined {
  return generateNPCs().find(n => n.id === id)
}
