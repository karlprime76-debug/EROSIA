import type { CriterionDefinition, ProfileSnapshot, CriterionResult } from '../types'

const COMMUNICATIVE_TRAITS = new Set(['sensible', 'spontané', 'romantique', 'passionné'])
const RESERVED_TRAITS = new Set(['ambitieux', 'exigeant', 'flexible', 'organisé'])

function hasBio(profile: ProfileSnapshot): boolean {
  return (profile.bio?.length ?? 0) > 30
}

function countTraitsInSet(profile: ProfileSnapshot, set: Set<string>): number {
  return profile.traits.filter((t) => set.has(t)).length
}

export const communicationCriterion: CriterionDefinition = {
  id: 'communication',
  label: 'Communication',
  icon: 'MessageCircle',
  weight: 0.2,
  description: 'Style et qualité de communication',
  async calculate(userA: ProfileSnapshot, userB: ProfileSnapshot): Promise<CriterionResult> {
    let score = 50
    const strengths: string[] = []
    const differences: string[] = []
    const tips: string[] = []

    const aBio = hasBio(userA)
    const bBio = hasBio(userB)

    if (aBio && bBio) {
      score += 15
      strengths.push('Vous avez tous les deux une bio détaillée — signe que vous aimez communiquer')
    } else if (aBio || bBio) {
      score += 5
      differences.push('L\'un de vous est plus expressif à l\'écrit que l\'autre')
      tips.push('Encouragez les échanges écrits, même si l\'un de vous est moins à l\'aise')
    }

    const aComm = countTraitsInSet(userA, COMMUNICATIVE_TRAITS)
    const bComm = countTraitsInSet(userB, COMMUNICATIVE_TRAITS)
    const aRes = countTraitsInSet(userA, RESERVED_TRAITS)
    const bRes = countTraitsInSet(userB, RESERVED_TRAITS)

    if (Math.abs(aComm - bComm) <= 1 && Math.abs(aRes - bRes) <= 1) {
      score += 15
      strengths.push('Vos styles de communication sont naturels l\'un pour l\'autre')
    } else if ((aComm > 0 && bRes > 0) || (bComm > 0 && aRes > 0)) {
      score -= 5
      differences.push('Vous avez des styles de communication opposés (expressif vs réservé)')
      tips.push('Apprenez à apprécier vos différences : l\'un apporte de la spontanéité, l\'autre de la réflexion')
    }

    if (userA.mood && userB.mood) {
      const socialMoods = new Set(['discuter', 'rencontre', 'disponible_ce_soir'])
      if (socialMoods.has(userA.mood) && socialMoods.has(userB.mood)) {
        score += 10
        strengths.push('Vous êtes tous les deux ouverts à la discussion en ce moment')
      }
    }

    if (userA.has_quiz && userB.has_quiz) {
      score += 10
      strengths.push('Vous avez tous les deux pris le temps de répondre au quiz de personnalité')
    } else if (!userA.has_quiz && !userB.has_quiz) {
      tips.push('Répondez au quiz de personnalité pour affiner votre compatibilité')
    }

    tips.push('Planifiez un appel ou un verre pour découvrir votre vrai rythme de communication')

    return { score: Math.min(100, Math.max(0, score)), strengths, differences, tips }
  },
}
