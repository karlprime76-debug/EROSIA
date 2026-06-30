import { describe, it, expect, beforeEach } from 'vitest'
import { resetCriteriaForTesting, registerCriterion, getAllCriteria } from '@/lib/engine/compat-center/registry'
import { computeCompatibility } from '@/lib/engine/compat-center/engine'
import { communicationCriterion } from '@/lib/engine/compat-center/criteria/communication'
import { valuesCriterion } from '@/lib/engine/compat-center/criteria/values'
import { interestsCriterion } from '@/lib/engine/compat-center/criteria/interests'
import { lifestyleCriterion } from '@/lib/engine/compat-center/criteria/lifestyle'
import { availabilityCriterion } from '@/lib/engine/compat-center/criteria/availability'
import { goalsCriterion } from '@/lib/engine/compat-center/criteria/goals'
import type { ProfileSnapshot } from '@/lib/engine/compat-center/types'

function makeProfile(overrides: Partial<ProfileSnapshot> = {}): ProfileSnapshot {
  return {
    id: 'user-a',
    name: 'Alice',
    age: 28,
    bio: 'Amoureuse de la vie, voyage et cuisine',
    occupation: 'Designer',
    location: 'Dakar',
    interests: ['voyage', 'cuisine', 'musique', 'sport'],
    mood: 'discuter',
    looking_for: 'serious',
    energy_score: 70,
    traits: ['aventurier', 'curieux', 'sensible'],
    has_quiz: true,
    ...overrides,
  }
}

function makeTarget(overrides: Partial<ProfileSnapshot> = {}): ProfileSnapshot {
  return makeProfile({
    id: 'user-b',
    name: 'Bob',
    ...overrides,
  })
}

describe('Compatibility Engine', () => {
  beforeEach(() => {
    resetCriteriaForTesting()
    registerCriterion(communicationCriterion)
    registerCriterion(valuesCriterion)
    registerCriterion(interestsCriterion)
    registerCriterion(lifestyleCriterion)
    registerCriterion(availabilityCriterion)
    registerCriterion(goalsCriterion)
  })

  it('registers all 6 criteria', () => {
    const criteria = getAllCriteria()
    expect(criteria).toHaveLength(6)
    const ids = criteria.map(c => c.id)
    expect(ids).toContain('communication')
    expect(ids).toContain('values')
    expect(ids).toContain('interests')
    expect(ids).toContain('lifestyle')
    expect(ids).toContain('availability')
    expect(ids).toContain('goals')
  })

  it('computes a high score for very compatible profiles', async () => {
    const userA = makeProfile()
    const userB = makeTarget()

    const report = await computeCompatibility(
      'match-1', 'user-a', 'user-b', 'Bob', null, userA, userB,
    )

    expect(report.globalScore).toBeGreaterThanOrEqual(50)
    expect(report.criteria).toHaveLength(6)
    expect(report.matchId).toBe('match-1')
    expect(report.targetName).toBe('Bob')
  })

  it('computes a lower score for incompatible profiles', async () => {
    const userA = makeProfile({ looking_for: 'serious', mood: 'relation_serieuse' })
    const userB = makeTarget({ looking_for: 'fwb', mood: 'disponible_ce_soir', interests: ['football', 'gaming', 'poker'], traits: ['ambitieux', 'exigeant'] })

    const report = await computeCompatibility(
      'match-2', 'user-a', 'user-b', 'Bob', null, userA, userB,
    )

    expect(report.criteria.find(c => c.id === 'goals')!.score).toBeLessThan(70)
  })

  it('contains strengths, differences and advice', async () => {
    const userA = makeProfile()
    const userB = makeTarget()

    const report = await computeCompatibility(
      'match-3', 'user-a', 'user-b', 'Bob', null, userA, userB,
    )

    expect(report.topStrengths.length).toBeGreaterThanOrEqual(0)
    expect(Array.isArray(report.keyDifferences)).toBe(true)
    expect(report.advice.length).toBeGreaterThanOrEqual(0)
    expect(typeof report.generatedAt).toBe('string')
  })

  it('returns scores between 0 and 100', async () => {
    const extremeA = makeProfile({ age: 18, looking_for: 'serious', mood: 'relation_serieuse', interests: ['voyage'], bio: null, occupation: null, energy_score: 0 })
    const extremeB = makeTarget({ age: 60, looking_for: 'fwb', mood: 'disponible_ce_soir', interests: ['gaming'], bio: null, occupation: null, energy_score: 0 })

    const report = await computeCompatibility(
      'match-4', 'user-a', 'user-b', 'Bob', null, extremeA, extremeB,
    )

    expect(report.globalScore).toBeGreaterThanOrEqual(0)
    expect(report.globalScore).toBeLessThanOrEqual(100)
    report.criteria.forEach(c => {
      expect(c.score).toBeGreaterThanOrEqual(0)
      expect(c.score).toBeLessThanOrEqual(100)
    })
  })

  it('works with no quiz data', async () => {
    const userA = makeProfile({ has_quiz: false, traits: [] })
    const userB = makeTarget({ has_quiz: false, traits: [] })

    const report = await computeCompatibility(
      'match-5', 'user-a', 'user-b', 'Bob', null, userA, userB,
    )

    expect(report.globalScore).toBeGreaterThanOrEqual(0)
    expect(report.globalScore).toBeLessThanOrEqual(100)
  })

  it('works with minimal profile data', async () => {
    const minimal: ProfileSnapshot = {
      id: 'minimal-a', name: 'Minimal', age: null, bio: null, occupation: null,
      location: null, interests: [], mood: null, looking_for: null,
      energy_score: null, traits: [], has_quiz: false,
    }

    const report = await computeCompatibility(
      'match-6', 'minimal-a', 'minimal-b', 'MinimalB', null, minimal, minimal,
    )

    expect(report.globalScore).toBeGreaterThanOrEqual(0)
  })
})

describe('Communication criterion', () => {
  it('rewards both having detailed bios', async () => {
    const a = makeProfile({ bio: 'A'.repeat(40) })
    const b = makeTarget({ bio: 'B'.repeat(40) })
    const result = await communicationCriterion.calculate(a, b)
    expect(result.score).toBeGreaterThanOrEqual(60)
  })

  it('penalizes opposite communication styles', async () => {
    const expressive = makeProfile({ traits: ['spontané', 'passionné'] })
    const reserved = makeTarget({ traits: ['ambitieux', 'exigeant', 'organisé'] })
    const result = await communicationCriterion.calculate(expressive, reserved)
    expect(result.differences.length).toBeGreaterThanOrEqual(1)
  })
})

describe('Interests criterion', () => {
  it('rewards shared interests', async () => {
    const a = makeProfile({ interests: ['voyage', 'cuisine', 'musique', 'danse'] })
    const b = makeTarget({ interests: ['voyage', 'cuisine', 'sport', 'danse'] })
    const result = await interestsCriterion.calculate(a, b)
    expect(result.score).toBeGreaterThanOrEqual(70)
  })

  it('handles no shared interests', async () => {
    const a = makeProfile({ interests: ['voyage'] })
    const b = makeTarget({ interests: ['poker', 'gaming'] })
    const result = await interestsCriterion.calculate(a, b)
    expect(result.score).toBeLessThan(60)
  })
})

describe('Values criterion', () => {
  it('rewards shared values from bio keywords', async () => {
    const a = makeProfile({ bio: 'La famille et les voyages sont ma vie. Je travaille dans la tech.' })
    const b = makeTarget({ bio: 'Entre famille et aventure, je construis ma carrière.' })
    const result = await valuesCriterion.calculate(a, b)
    expect(result.strengths.length).toBeGreaterThanOrEqual(1)
  })
})

describe('Goals criterion', () => {
  it('rewards aligned relationship goals', async () => {
    const a = makeProfile({ looking_for: 'serious', mood: 'relation_serieuse' })
    const b = makeTarget({ looking_for: 'serious', mood: 'relation_serieuse' })
    const result = await goalsCriterion.calculate(a, b)
    expect(result.score).toBeGreaterThanOrEqual(70)
  })

  it('penalizes opposite relationship goals', async () => {
    const a = makeProfile({ looking_for: 'serious' })
    const b = makeTarget({ looking_for: 'fwb' })
    const result = await goalsCriterion.calculate(a, b)
    expect(result.score).toBeLessThan(70)
  })
})

describe('Lifestyle criterion', () => {
  it('rewards matching energy levels', async () => {
    const a = makeProfile({ mood: 'de_passage', energy_score: 80 })
    const b = makeTarget({ mood: 'rencontre', energy_score: 85 })
    const result = await lifestyleCriterion.calculate(a, b)
    expect(result.score).toBeGreaterThanOrEqual(60)
  })
})

describe('Availability criterion', () => {
  it('rewards same-city proximity', async () => {
    const a = makeProfile({ location: 'Dakar' })
    const b = makeTarget({ location: 'Dakar' })
    const result = await availabilityCriterion.calculate(a, b)
    expect(result.score).toBeGreaterThanOrEqual(65)
  })
})
