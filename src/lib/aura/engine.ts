import type { AuraState, AuraLabel, AuraConfig } from './types'

const MOOD_BONUS: Record<string, number> = {
  rencontre: 15,
  disponible_ce_soir: 12,
  relation_serieuse: 10,
  chill: 8,
  discuter: 5,
  de_passage: 2,
}

const THRESHOLDS: { max: number; label: AuraLabel; color: string; secondary: string; glow: number; particles: number }[] = [
  { max: 20, label: 'Brouillard', color: '#6B7280', secondary: '#3B82F6', glow: 0.2, particles: 10 },
  { max: 40, label: 'Lueur', color: '#6366F1', secondary: '#8B5CF6', glow: 0.4, particles: 20 },
  { max: 60, label: 'Éclat', color: '#A855F7', secondary: '#EC4899', glow: 0.6, particles: 30 },
  { max: 80, label: 'Rayonnement', color: '#F43F5E', secondary: '#F97316', glow: 0.8, particles: 40 },
  { max: 100, label: 'Auréole', color: '#F59E0B', secondary: '#FCD34D', glow: 1.0, particles: 60 },
]

function interpolate(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function getTier(level: number): typeof THRESHOLDS[number] {
  for (const t of THRESHOLDS) {
    if (level <= t.max) return t
  }
  return THRESHOLDS[THRESHOLDS.length - 1]
}

function distanceToLastActive(lastActiveAt: string): number {
  const diff = Date.now() - new Date(lastActiveAt).getTime()
  const hours = diff / (1000 * 60 * 60)
  if (hours < 1) return 15
  if (hours < 6) return 12
  if (hours < 24) return 8
  if (hours < 72) return 4
  return 0
}

export function computeAura(config: AuraConfig): AuraState {
  const energy = config.energyScore ?? 50
  const trust = config.trustScore ?? 50
  const moodBonus = config.mood ? (MOOD_BONUS[config.mood] ?? 0) : 0
  const activity = config.lastActiveAt ? distanceToLastActive(config.lastActiveAt) : 0
  const profile = config.profileCompleteness

  const rawScore = Math.round(energy * 0.30 + trust * 0.25 + moodBonus + activity + profile)
  const level = Math.max(0, Math.min(100, rawScore))

  const tier = getTier(level)
  const prevTierIndex = Math.max(0, THRESHOLDS.indexOf(tier) - 1)
  const prevTier = THRESHOLDS[prevTierIndex]
  const tierSpan = tier.max - prevTier.max
  const t = tierSpan > 0 ? (level - prevTier.max) / tierSpan : 0

  return {
    level,
    color: tier.color,
    secondaryColor: tier.secondary,
    glowIntensity: parseFloat(interpolate(tier.glow, Math.min(1, tier.glow + 0.2), t).toFixed(2)),
    particleCount: Math.round(interpolate(tier.particles, t > 0.5 ? Math.min(80, tier.particles + 20) : tier.particles, t)),
    label: tier.label,
    factors: {
      energy: Math.round(energy * 0.30),
      trust: Math.round(trust * 0.25),
      mood: moodBonus,
      activity: activity,
      profile: profile,
    },
    updatedAt: new Date().toISOString(),
  }
}
