import type { CriterionDefinition, ProfileSnapshot, CriterionResult } from '../types'

const COMPAT_MATRIX: Record<string, Record<string, number>> = {
  serious: { serious: 30, casual: 5, friendship: 10, fwb: -10, open: 0 },
  casual: { serious: 5, casual: 25, friendship: 15, fwb: 20, open: 15 },
  friendship: { serious: 10, casual: 15, friendship: 25, fwb: 5, open: 15 },
  fwb: { serious: -10, casual: 20, friendship: 5, fwb: 30, open: 10 },
  open: { serious: 0, casual: 15, friendship: 15, fwb: 10, open: 25 },
}

export const goalsCriterion: CriterionDefinition = {
  id: 'goals',
  label: 'Objectifs relationnels',
  icon: 'Target',
  weight: 0.15,
  description: 'Attentes et projets de relation',
  async calculate(userA: ProfileSnapshot, userB: ProfileSnapshot): Promise<CriterionResult> {
    let score = 40
    const strengths: string[] = []
    const differences: string[] = []
    const tips: string[] = []

    const aGoal = (userA.looking_for ?? 'friendship') as string
    const bGoal = (userB.looking_for ?? 'friendship') as string

    const compatScore = COMPAT_MATRIX[aGoal]?.[bGoal] ?? 0
    const reverseScore = COMPAT_MATRIX[bGoal]?.[aGoal] ?? 0
    const goalCompat = Math.round((compatScore + reverseScore) / 2)

    score += Math.max(-10, goalCompat)

    if (aGoal === bGoal) {
      strengths.push(`Vous cherchez tous les deux la même chose : ${translateGoal(aGoal)}`)
    } else {
      differences.push(`Tu recherches ${translateGoal(aGoal).toLowerCase()} alors que ${translateGoal(bGoal).toLowerCase()}`)
      tips.push('Soyez clairs sur vos intentions dès le début pour éviter les malentendus')
    }

    if (userA.age && userB.age) {
      const ageDiff = Math.abs(userA.age - userB.age)
      if (ageDiff <= 3) {
        score += 15
        strengths.push('Votre différence d\'âge est idéale pour une connexion naturelle')
      } else if (ageDiff <= 7) {
        score += 8
      } else {
        tips.push('Votre différence d\'âge peut apporter des perspectives enrichissantes')
      }
    }

    const aMoodGoal = userA.mood === 'relation_serieuse' || aGoal === 'serious'
    const bMoodGoal = userB.mood === 'relation_serieuse' || bGoal === 'serious'
    if (aMoodGoal && bMoodGoal) {
      score += 10
      strengths.push('Vous êtes tous les deux alignés sur une relation sérieuse')
    }

    return { score: Math.min(100, Math.max(0, score)), strengths, differences, tips }
  },
}

function translateGoal(goal: string): string {
  const map: Record<string, string> = {
    serious: 'une relation sérieuse',
    casual: 'du casual',
    friendship: 'de l\'amitié',
    fwb: 'un plan cul',
    open: 'une relation ouverte',
  }
  return map[goal] ?? goal
}
