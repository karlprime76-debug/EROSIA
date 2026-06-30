import type { CriterionDefinition, ProfileSnapshot, CriterionResult } from '../types'

export const interestsCriterion: CriterionDefinition = {
  id: 'interests',
  label: 'Centres d\'intérêt',
  icon: 'Heart',
  weight: 0.2,
  description: 'Passions et loisirs partagés',
  async calculate(userA: ProfileSnapshot, userB: ProfileSnapshot): Promise<CriterionResult> {
    let score = 40
    const strengths: string[] = []
    const differences: string[] = []
    const tips: string[] = []

    const interestsA = new Set((userA.interests ?? []).map((i) => i.toLowerCase()))
    const interestsB = new Set((userB.interests ?? []).map((i) => i.toLowerCase()))

    const shared = [...interestsA].filter((i) => interestsB.has(i))
    const onlyA = [...interestsA].filter((i) => !interestsB.has(i))
    const onlyB = [...interestsB].filter((i) => !interestsA.has(i))

    if (shared.length >= 3) {
      score += 25
      strengths.push(`${shared.length} centres d'intérêt en commun — vous ne manquerez jamais de choses à faire ensemble`)
    } else if (shared.length >= 1) {
      score += 15
      strengths.push(`${shared.length} centre(s) d'intérêt partagé(s)`)
    } else {
      score -= 5
      tips.push('Explorez les passions de l\'autre — vous pourriez découvrir de nouveaux horizons')
    }

    if (shared.length > 0) {
      tips.push(`Planifiez une activité autour de ${shared[0]} pour votre premier rendez-vous`)
    }

    const traitOverlap = userA.traits.filter((t) => userB.traits.includes(t))
    if (traitOverlap.length >= 2) {
      score += 15
      strengths.push('Vos traits de personnalité sont très compatibles')
    } else if (traitOverlap.length >= 1) {
      score += 8
    }

    if (onlyA.length > 2 && onlyB.length > 2) {
      score += 10
      strengths.push('Vous avez chacun des passions uniques à partager avec l\'autre')
    }

    if (onlyA.length > 0 || onlyB.length > 0) {
      differences.push('Certains de vos loisirs sont différents — une occasion de découvrir')
    }

    return { score: Math.min(100, Math.max(0, score)), strengths, differences, tips }
  },
}
