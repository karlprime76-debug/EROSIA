export type AuraLabel = 'Brouillard' | 'Lueur' | 'Éclat' | 'Rayonnement' | 'Auréole'

export interface AuraState {
  level: number
  color: string
  secondaryColor: string
  glowIntensity: number
  particleCount: number
  label: AuraLabel
  factors: {
    energy: number
    trust: number
    mood: number
    activity: number
    profile: number
  }
  updatedAt: string
}

export interface AuraConfig {
  userId: string
  energyScore?: number | null
  trustScore?: number | null
  mood?: string | null
  lastActiveAt?: string | null
  profileCompleteness: number
}
