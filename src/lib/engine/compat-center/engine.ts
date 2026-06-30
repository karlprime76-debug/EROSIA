import { getAllCriteria } from './registry'
import type { ProfileSnapshot, CompatibilityReport, CriterionResultWithMeta } from './types'

export async function computeCompatibility(
  matchId: string,
  userId: string,
  targetId: string,
  targetName: string,
  targetPhoto: string | null,
  userA: ProfileSnapshot,
  userB: ProfileSnapshot,
): Promise<CompatibilityReport> {
  const criteria = getAllCriteria()

  const results = await Promise.all(
    criteria.map(async (c) => {
      const result = await c.calculate(userA, userB)
      return {
        ...result,
        id: c.id,
        label: c.label,
        icon: c.icon,
        weight: c.weight,
        description: c.description,
      } satisfies CriterionResultWithMeta
    }),
  )

  const globalScore = Math.round(
    results.reduce((sum, r) => sum + r.score * r.weight, 0),
  )

  const topStrengths = results
    .flatMap((r) => r.strengths)
    .slice(0, 5)

  const keyDifferences = results
    .flatMap((r) => r.differences)
    .slice(0, 4)

  const advice = results
    .flatMap((r) => r.tips)
    .slice(0, 5)

  return {
    matchId,
    userId,
    targetId,
    targetName,
    targetPhoto,
    globalScore: Math.min(100, Math.max(0, globalScore)),
    criteria: results,
    topStrengths,
    keyDifferences,
    advice,
    generatedAt: new Date().toISOString(),
  }
}
