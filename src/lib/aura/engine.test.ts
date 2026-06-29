import { describe, it, expect } from 'vitest'
import { computeAura } from './engine'
import type { AuraConfig } from './types'

function makeConfig(overrides: Partial<AuraConfig> = {}): AuraConfig {
  return {
    userId: 'test-user',
    energyScore: 50,
    trustScore: 50,
    mood: 'discuter',
    lastActiveAt: new Date().toISOString(),
    profileCompleteness: 10,
    ...overrides,
  }
}

describe('computeAura', () => {
  it('returns a valid AuraState with defaults', () => {
    const result = computeAura(makeConfig())
    expect(result.level).toBeGreaterThanOrEqual(0)
    expect(result.level).toBeLessThanOrEqual(100)
    expect(result.color).toBeTruthy()
    expect(result.secondaryColor).toBeTruthy()
    expect(result.glowIntensity).toBeGreaterThanOrEqual(0)
    expect(result.glowIntensity).toBeLessThanOrEqual(1)
    expect(result.particleCount).toBeGreaterThanOrEqual(10)
    expect(result.particleCount).toBeLessThanOrEqual(80)
    expect(result.label).toBeTruthy()
    expect(result.factors).toHaveProperty('energy')
    expect(result.factors).toHaveProperty('trust')
    expect(result.factors).toHaveProperty('mood')
    expect(result.factors).toHaveProperty('activity')
    expect(result.factors).toHaveProperty('profile')
    expect(result.updatedAt).toBeTruthy()
  })

  it('returns Brouillard for very low scores', () => {
    const result = computeAura(makeConfig({
      energyScore: 5,
      trustScore: 5,
      mood: 'de_passage',
      lastActiveAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      profileCompleteness: 1,
    }))
    expect(result.label).toBe('Brouillard')
    expect(result.level).toBeLessThanOrEqual(20)
  })

  it('returns Auréole for very high scores', () => {
    const result = computeAura(makeConfig({
      energyScore: 95,
      trustScore: 95,
      mood: 'rencontre',
      lastActiveAt: new Date().toISOString(),
      profileCompleteness: 17,
    }))
    expect(result.label).toBe('Auréole')
    expect(result.level).toBeGreaterThanOrEqual(81)
  })

  it('returns higher aura for rencontre mood vs de_passage', () => {
    const base = makeConfig({ energyScore: 60, trustScore: 60, profileCompleteness: 10 })
    const high = computeAura({ ...base, mood: 'rencontre', lastActiveAt: new Date().toISOString() })
    const low = computeAura({ ...base, mood: 'de_passage', lastActiveAt: new Date(Date.now() - 48 * 3600000).toISOString() })
    expect(high.level).toBeGreaterThan(low.level)
  })

  it('boosts for high profile completeness', () => {
    const base = makeConfig({ energyScore: 50, trustScore: 50, mood: 'discuter', lastActiveAt: new Date(Date.now() - 3600000).toISOString() })
    const full = computeAura({ ...base, profileCompleteness: 17 })
    const empty = computeAura({ ...base, profileCompleteness: 0 })
    expect(full.level).toBeGreaterThan(empty.level)
  })

  it('handles missing optional fields gracefully', () => {
    const result = computeAura({
      userId: 'test',
      profileCompleteness: 5,
    })
    expect(result.level).toBeGreaterThanOrEqual(0)
    expect(result.level).toBeLessThanOrEqual(100)
  })

  it('glowIntensity scales with level', () => {
    const low = computeAura(makeConfig({ energyScore: 0, trustScore: 0, mood: 'de_passage', lastActiveAt: new Date(0).toISOString(), profileCompleteness: 0 }))
    const high = computeAura(makeConfig({ energyScore: 100, trustScore: 100, mood: 'rencontre', profileCompleteness: 17 }))
    expect(high.glowIntensity).toBeGreaterThanOrEqual(low.glowIntensity)
  })

  it('particle count increases with level', () => {
    const low = computeAura(makeConfig({ energyScore: 0, trustScore: 0, mood: 'de_passage', lastActiveAt: new Date(0).toISOString(), profileCompleteness: 0 }))
    const high = computeAura(makeConfig({ energyScore: 100, trustScore: 100, mood: 'rencontre', profileCompleteness: 17 }))
    expect(high.particleCount).toBeGreaterThanOrEqual(low.particleCount)
  })
})
